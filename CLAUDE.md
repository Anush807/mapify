# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Mapify is implemented against `spec/00-implementation-mapify.md`. That spec is the
source of truth for the data model and API contract — **ask before deviating from
either**; component structure and styling are flexible. `README.md` covers setup
and the API surface; this file covers what you can't discover by reading one file.

## Commands

```bash
# backend/
npm run dev                      # tsx watch src/server.ts -> :3000
npm run build && npm start       # tsc to dist/, then node dist/server.js
npm run typecheck                # tsc --noEmit
npm run test:ai -- "learn rust"  # generate + validate a roadmap, no DB
npx prisma migrate dev           # apply schema changes
npx prisma generate              # regenerate the client into src/generated/prisma

# frontend/
npm run dev                      # vite -> :5173, proxies /api to :3000
npm run build                    # tsc -b && vite build
npm run lint
```

There is no test runner wired up yet — verification so far has been curl against
the API plus a headless-Chrome pass over the UI flow.

## Deviations from the spec

- **State is Jotai, not Recoil** (spec §2/§7), on React 19. Recoil 0.7.7 has been
  unmaintained since 2024 and reads
  `React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher`,
  which React 19 removed — under React 19 every page rendered blank. Recoil's
  peer range (`react: >=16.13.1`) does not catch this, so npm installs it
  happily and it breaks at runtime. Swapped at the user's request.
  In Jotai there is no separate `selector` concept: derived state is just an
  atom taking a `get`, so `progressStatsAtom` and `totalNodeCountAtom` are
  ordinary atoms. Atoms are module-level objects with no string `key`.
- **Prisma 7 moved the connection config** — see below. The models themselves
  match the spec exactly.
- **A fourth `mock` AI adapter** — see below.
- **Two token deviations from spec/01 §2**, both forced by its own §8 contrast
  gate — see the Design system section.

## Pinned versions — don't "upgrade" without reading why

- **Tailwind is v3, not v4** — the shadcn/ui components here use the v3 config +
  CSS-variable setup.

## Prisma 7 specifics

Prisma 7 moved three things that most Prisma docs and muscle memory still put
elsewhere:

- The schema path and the connection URL live in `backend/prisma.config.ts`, not
  in `package.json#prisma` and not as `url = env("DATABASE_URL")` in the
  datasource block (that's now a validation error).
- Prisma 7 doesn't auto-load `.env` — `prisma.config.ts` imports `dotenv/config`.
- The client connects through a **driver adapter** (`@prisma/adapter-pg`), wired
  in `src/lib/prisma.ts`. There is no implicit connection.
- The generated client lands in `src/generated/prisma/` (gitignored) and is
  imported from there, not from `@prisma/client`.

## Architecture

Everything rests on one invariant: **the AI never writes directly to the
database.** Raw output is parsed and validated before persistence; invalid output
never reaches the JSONB column.

The generate path, and what owns what:

```
POST /api/roadmaps
  -> services/ai/index.ts      picks an adapter by AI_PROVIDER
  -> <provider>.adapter.ts     topic in, RAW TEXT out — no parsing, ever
  -> roadmap.service.ts        extractJson -> Zod -> post-parse guards
                               on failure: exactly one retry, error fed back
  -> prisma                    persists the validated tree
```

Keep the layer boundary intact: adapters never parse or validate, so a new
provider is one file plus an env flip. `roadmap.service.ts` is the only place
that knows what a valid roadmap is.

**Post-parse guards matter.** `RoadmapSchema` validates shape but not size — a
recursive Zod schema will happily accept a 10,000-node, 40-level tree.
`validateTreeConstraints` enforces max depth (4), max nodes (150), and globally
unique ids. Unique ids are not cosmetic: `Progress.completedIds` stores node ids,
so a duplicate id silently breaks progress tracking for both nodes.

**The retry gets the specific failure.** `parseAndValidate` returns a human-readable
reason, and `buildRetryPrompt` embeds it. Retrying with a generic "try again"
measurably wastes the one retry the design allows.

**`extractJson` recovers from fences and prose** before validation, because a
stray ` ```json ` wrapper is the most common deviation and burning the retry on
something that mechanical is wasteful.

### Storage split

`Roadmap.content` is JSONB (variable-depth tree, generated once, read whole).
Progress is a separate table keyed `@@unique([userId, roadmapId])` — it's
per-user and changes far more often, so a checkbox click must never rewrite the
tree. `updateProgress` intersects incoming ids against the ids actually in the
tree, so a stale tab can't write junk.

### Ownership

Every roadmap route returns **404, not 403**, for a roadmap owned by someone
else — 403 would confirm the id exists. `getRoadmap`/`deleteRoadmap`/
`updateProgress` all re-check `userId` rather than trusting the route.

### Frontend

- The JWT is httpOnly, so JS cannot read it. `App.tsx` calls `GET /auth/me` once
  on boot to rehydrate `authAtom`; `authReadyAtom` distinguishes "logged out"
  from "not checked yet". `RequireAuth` waits on `authReadyAtom` — redirecting
  before it settles bounces logged-in users to /login on every refresh.
- `progressAtom` is a `Set`, not an array: ~150 nodes each re-render on every
  toggle, so membership tests are the hot path. Every write builds a new `Set` —
  mutating in place would not change the reference and subscribers wouldn't
  re-render.
- `RoadmapView` debounces the progress PATCH by 500ms and skips the first
  effect run (seeding the atom on mount would otherwise fire a pointless write).
- Checking a parent node checks its whole subtree — a ticked parent above
  unticked children reads as a bug.

## Design system (spec/01)

Tokens live in `frontend/src/index.css` under `:root` and `.dark`, consumed as
`hsl(var(--token))` through `tailwind.config.js`. **No component hardcodes a hex.**

Two brand hues with fixed jobs — never interchangeable:
`primary` (sunset orange) = forward motion / active / in progress.
`secondary` (red-violet) = depth / completed / featured.
Dark mode is not an inversion: the neutrals carry a violet undertone so the brand
hues read as native to the surface.

### Two accessibility fixes worth keeping

- **`--primary-foreground` is dark ink, not white.** Spec §2 lists `#FFFFFF` on
  `#FF5841`, which measures 3.12:1 and fails the AA gate spec §8 demands. The
  brand orange is untouched; only the ink on it changed, to the spec's own
  `foreground` — 5.88:1. Secondary keeps white (5.03:1) exactly as specified.
- **`--primary-strong` (`#CE3A22`) exists for orange-as-text.** Same hue,
  darkened until small text clears AA on white (4.94:1). Use it for eyebrows,
  links, and icons on the page background; use plain `primary` for fills,
  markers, and the path gradient (graphical, 3.0 threshold). In dark mode it
  aliases `primary`, which already passes.

### shadcn token-semantics trap

shadcn's `Progress` hardcodes `bg-secondary` for its **track**, assuming
`secondary` is a muted neutral. Here `secondary` is a vivid red-violet, so every
bar rendered as ~70% filled in bright pink. Every `Progress` call site passes
`className="h-1.5 bg-muted"`. Watch for the same assumption in any newly added
component (`variant="secondary"` on Button/Badge is a *vivid* treatment here,
not a quiet one).

### Type system

Display `Bricolage Grotesque` (titles only), body `Instrument Sans`, utility
`IBM Plex Mono`. The mono face is not decoration: it marks waypoint data —
eyebrows, step counters, percentages — read as coordinates along a route rather
than prose. Use the `.type-waypoint` utility for those.

### Theme

`ThemeProvider` — class-based (`.dark` on `<html>`), `localStorage`-persisted,
three states (light / dark / system). `resolvedTheme` is derived during render,
not stored; the only effect mirrors it onto the document element.

## The roadmap tree

The signature element, and the one place visual boldness is spent. Everything
around it stays quiet deliberately.

**Hybrid DOM + SVG.** Nodes are laid out in normal DOM so titles wrap and
branches collapse naturally; the connecting curves are one absolutely-positioned
SVG overlay whose paths are measured from the live marker positions
(`PathConnectors.tsx`). A pure-SVG layout could not reflow variable-length text.
Geometry is re-measured by a `ResizeObserver` on the container — which fires on
every frame of a collapse animation, so expand/collapse, window resize, and web
font load are all covered by that one observer.

Three details that are easy to break:

- **Curve shape.** Both bezier control points sit on the *parent's* x, so the
  line descends in a single trunk and only sweeps sideways at the end. A
  symmetric S-curve (control points split between parent and child x) sends each
  child a long diagonal — siblings then cross each other and cut across the
  description text.
- **The spine.** `collectEdges` emits edges between *consecutive top-level
  stages* as well as parent→child. Without them the tree renders as disconnected
  clusters instead of one continuous route. Parent/child share an x on the
  spine, so the same bezier degenerates to a straight vertical line.
- **The gradient is `gradientUnits="userSpaceOnUse"`** spanning the full tree
  height. With the default `objectBoundingBox` each segment restarts the ramp and
  every line looks identical. Across the whole path, early stages read orange and
  deepen into red-violet the further you travel — which is what §2 actually asks
  for.

**The signature moment**: completing a node transitions its incoming segment's
`stroke-dashoffset` 1 → 0 over 620ms, drawing the solid gradient line over the
dashed one. `pathLength={1}` normalises dash units so a single transition works
for any segment length. Dash properties are set via inline `style`, not
presentation attributes, so the transition acts on the same declaration it
animates.

**Node states are distinguishable without colour** (§8): completed = filled +
check glyph, current = filled + pulse ring + inline "Up next" label, upcoming =
hollow ring at 50% opacity. Markers are real `<button>`s carrying
`data-node-id`, which is also how "Up next" scroll-to works.

**Numbering is only on top-level stages.** Those are a real sequence — the route
through the roadmap. A stage's children are things to learn, not steps 01/02/03,
so they get a dot.

**Motion and scroll.** `useLenis` mounts one instance per view and destroys it on
unmount; a global instance would fight the next route for scroll control.
`useReducedMotion` is live (the OS setting can flip without a reload) and under
`reduce` Lenis is skipped entirely for native scroll, the path transition becomes
`none`, and the CSS in `index.css` neutralises animation globally.

## Landing page (spec/02)

Public marketing page at `/`, brought in by `pages/Landing.tsx` with its own nav
and footer — it deliberately sits **outside** `<Layout>`. The signed-in generator
moved from `/` to **`/new`**; the app logo points at `/dashboard` when signed in
and `/` otherwise.

**Light-only, without fighting ThemeProvider.** The shell puts `.dark` on
`<html>`, so the page root carries `.theme-light-only`, a class in `index.css`
that re-declares the light token set on its own scope. Children then resolve
light values normally. **Keep that block in sync with `:root`** — they are
duplicated by necessity.

**Typography reuses the app's stack** rather than introducing a marketing face:
Bricolage Grotesque / Instrument Sans / IBM Plex Mono. Spec §2 asks for a
characterful, slightly condensed display face, which Bricolage already is, and
§2's "should feel like the same product, not a separate marketing site" makes
reuse the point.

**One animation budget, spent on the hero.** `HeroPathAnimation` draws an SVG
route via `stroke-dashoffset` while four markers spring in as the line reaches
them; the last is a flag, so the path visibly arrives. Node positions are
**sampled from the real geometry** (`getTotalLength` / `getPointAtLength`), not
hand-placed — hand-placed coordinates drift the instant the curve is edited.
Labels are HTML absolutely positioned from those sampled points, so they scale
with the type system instead of the viewBox; the endpoint label drops *below* its
marker because it sits near the right edge. Nothing else on the page autoplays.

**Everything else is scroll-triggered through one component.** `Reveal` owns the
only easing, distance, and duration on the page, and always uses
`viewport={{ once: true }}`. Add new sections through it rather than hand-rolling
a `whileInView` — per-section tuning is what makes a page feel like several
animation systems bolted together.

**The example preview reuses the product**, not a lookalike: `RoadmapPreview`
feeds static nodes through the same `collectEdges` and the same `PathConnectors`
used by the live tree, and both it and `NodeMarker` take their state styling from
`lib/node-marker-styles.ts` so the two can never drift. Two things to preserve if
you touch it — they caused an infinite render loop the first time:

- the `edges` array **must** be memoised (`PathConnectors` keys its measure
  effect on that array's identity), and
- markers must register from a `useEffect`, never an inline `ref` callback — a
  callback ref is recreated each render and registering bumps state.

Motion writes `stroke-dashoffset` as an **attribute**, not inline style; check
`getComputedStyle`, and scope any hero assertion to `svg[data-hero-animation]`,
since the preview's connectors also use `pathLength={1}` and its upcoming
segments correctly sit at offset 1.

**Content note:** spec §6 left the third "Why it helps" bullet as an explicit
placeholder with "don't ship a vague third bullet just to make it three". The
shipped third card claims roadmaps are generated per-topic rather than picked
from a catalogue — true of this codebase, but it is filling someone else's
placeholder and should be reviewed.

## shadcn CLI

`components.json` is wired and `npx shadcn@latest add <component>` works. It
resolves the `@/` alias from the **root** `tsconfig.json`, which is why that file
carries `baseUrl` + `paths` despite being a solution-style config with only
references — without them the CLI writes to a literal `@/` directory. TS 5.9
warns that `baseUrl` is deprecated, hence `"ignoreDeprecations": "6.0"`.

Do not hand-roll a component shadcn covers, and prefer `gap-*` over `space-y-*`,
`size-*` over `w-/h-` pairs, and semantic tokens over raw colours.

## The mock AI provider

`AI_PROVIDER=mock` (the default in `.env`) returns a valid roadmap with no API
key, so the full flow is runnable offline. It is not in the spec — it exists
because none of the real providers had keys available. `MOCK_FORCE_INVALID=1`
makes it emit junk, which is how the retry-then-422 path gets exercised.

Real-provider models: Gemini `gemini-2.5-flash`, OpenAI `gpt-4o-mini`, Claude
`claude-opus-5`. None of the three has been run against a live key.

## Environment

`backend/.env` (see `.env.example`): `DATABASE_URL`, `JWT_SECRET` (16+ chars),
`PORT`, `CORS_ORIGIN`, `AI_PROVIDER`, and the per-provider keys. `src/config/env.ts`
validates all of it with Zod at boot and throws — config errors surface at
startup, not at the first request that needs them.

## Skills

- Frontend Design: see .claude/skills/frontend-design.md
- shadcn: use shadcn skill for all components  
- frontend-ui-ux: see .claude/awesome-design-skills/<skill-folder>/SKILL.md
- Awesome Design: see .claude/awesome-design-skills/ for all available design skills