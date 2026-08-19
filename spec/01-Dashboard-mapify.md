# Mapify — Dashboard & Roadmap Tree UI Spec

Scope: **dashboard and roadmap visualization UI only.** Not auth, not landing
page. This spec assumes those exist separately and this UI sits behind them.

Before building anything, consult in this order:
1. `.claude/skills/frontend-design.md` — overall design judgment, restraint, signature element
2. `.claude/awesome-design-skills/` — browse available skills, use whichever fits a
   dashboard/data-viz-adjacent product best (likely dashboard layout + navigation patterns)
3. shadcn skill — for every component; don't hand-roll a component shadcn already covers
4. This spec — the concrete decisions (tokens, structure, the tree) specific to Mapify

---

## 1. Design Direction

Mapify's job is to make a learning path feel like a real path — something with
direction, progress, and a visible destination. That's the thesis the roadmap
tree should carry: not a settings-page list, a route.

**Signature element:** the roadmap tree itself. This is the one place to spend
visual boldness — connected nodes with a traced path, not a generic org-chart.
Everything else (dashboard shell, cards, nav) should be quiet and get out of
its way.

**Avoid:** numbered badges on every node just for decoration (only number
nodes where sequence is real — i.e., a strictly linear track; branching trees
shouldn't be forced into 01/02/03). Avoid generic gradient-hero-with-stats
dashboard clichés. Avoid making every card the same weight — a completed
roadmap, one in progress, and a brand-new one should not look interchangeable.

---

## 2. Color System

Brand colors: White `#FFFFFF`, Sunset Orange `#FF5841`, Red-Violet `#C53678`.
Both are warm, saturated, and close in temperature — treat orange as the
"forward motion / active" color and red-violet as the "depth / completed or
featured" color, rather than using them interchangeably. Dark mode isn't just
inverted — the neutrals get a warm violet undertone so the brand colors still
feel native to the surface instead of sitting on top of generic slate-gray.

Define these as CSS variables (shadcn's `hsl(var(--token))` pattern) in
`globals.css`, both under `:root` and `.dark`.

### Light mode

| Token | Hex | Use |
|---|---|---|
| `background` | `#FFFFFF` | page background |
| `foreground` | `#1A1218` | body text — near-black with a violet undertone, not pure black |
| `card` | `#FFFFFF` | card surfaces |
| `card-foreground` | `#1A1218` | |
| `muted` | `#FFF3F0` | subtle section backgrounds — warm off-white, barely-there orange tint |
| `muted-foreground` | `#6B5A5F` | secondary text |
| `primary` | `#FF5841` | sunset orange — primary actions, active states, "in progress" |
| `primary-foreground` | `#FFFFFF` | |
| `secondary` | `#C53678` | red-violet — completed states, featured/emphasis |
| `secondary-foreground` | `#FFFFFF` | |
| `accent` | `#FDE7E0` | light orange tint for hover/highlight backgrounds |
| `border` | `#F0DEE2` | warm-tinted border, not neutral gray |
| `ring` | `#FF5841` | focus ring |

### Dark mode

| Token | Hex | Use |
|---|---|---|
| `background` | `#140B10` | near-black with violet undertone |
| `foreground` | `#F5EDEF` | warm off-white |
| `card` | `#1C1116` | slightly lifted from background |
| `card-foreground` | `#F5EDEF` | |
| `muted` | `#241521` | |
| `muted-foreground` | `#B8A2AB` | |
| `primary` | `#FF6B54` | orange, lifted slightly for contrast on dark bg |
| `primary-foreground` | `#140B10` | |
| `secondary` | `#DE4F92` | red-violet, lifted for dark bg |
| `secondary-foreground` | `#140B10` | |
| `accent` | `#2E1522` | dark plum accent background |
| `border` | `#2E1B29` | |
| `ring` | `#FF6B54` | |

Node-state colors (tree-specific, both modes — derive from the two brand
hues, don't introduce a third unrelated color like generic green/gray):

- **Completed:** `secondary` (red-violet) fill, filled checkmark
- **Current / in progress:** `primary` (orange) fill, subtle pulse or glow ring
- **Upcoming / locked:** `muted-foreground` outline only, no fill, reduced opacity (~50%)
- **Path line (completed segment):** solid gradient, orange → red-violet, 2px
- **Path line (upcoming segment):** `border` color, dashed, 1.5px

---

## 3. Dark Mode

- Implement via class-based toggle (`class="dark"` on `<html>`), not media-query-only,
  so users can override system preference
- Theme state: a `ThemeProvider` (e.g. `next-themes` if on Next.js, or a small
  custom context if not) wrapping the app, persisted to `localStorage`
- Toggle control lives in the dashboard top bar — shadcn `DropdownMenu` or a
  simple icon `Button` (sun/moon, animated swap via CSS, not a full remount)
- No component should hardcode a hex value — everything pulls from the CSS
  variable tokens above so light/dark switching is automatic
- Respect `prefers-reduced-motion` for the theme-swap transition and for tree
  animations (Section 5)

---

## 4. Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│  Top bar: logo, search (optional), theme toggle, │
│  user menu                                       │
├───────────┬───────────────────────────────────────┤
│           │  Page header: "Your Roadmaps" + New   │
│  Sidebar  │  (shadcn Button, primary color)        │
│  (nav —   ├───────────────────────────────────────┤
│  optional │  Filter/sort row (All / In progress /  │
│  if only  │  Completed — shadcn Tabs or ToggleGroup)│
│  one view)│                                         │
│           │  Roadmap grid (see below)               │
└───────────┴───────────────────────────────────────┘
```

If the dashboard only has one real view (list of roadmaps), skip the sidebar
entirely — a persistent nav for a single destination is dead weight. Use it
only if there's a second nav-worthy section (e.g. profile/settings).

**Roadmap cards** (shadcn `Card`): keep, but differentiate by state instead of
making every card identical:
- In-progress card: `primary` accent border-left (3px), progress bar (shadcn
  `Progress`, orange fill) showing `completedIds / totalNodes`
- Completed card: `secondary` accent border-left, a filled badge ("Completed")
  in `secondary`
- New/untouched card: neutral border, no progress bar, just topic + created date

Empty state (no roadmaps yet): don't just show blank space — a short, direct
line in the interface's voice ("No roadmaps yet — generate your first one")
plus the primary CTA. Treat it as an invitation, not a dead end, per the
writing guidance in the frontend-design skill.

Grid: responsive, 3 columns desktop / 2 tablet / 1 mobile. Use shadcn's layout
primitives + Tailwind grid, not a custom masonry.

---

## 5. Roadmap Tree UI

This replaces the current card-based roadmap display entirely.

### Structure

- Root node at top (or left, on wide screens — see orientation below), branching
  down/out into children, matching the `content.nodes` recursive shape from the
  backend spec (each node: id, title, description, resources, children)
- **Orientation:** vertical top-to-bottom on mobile and narrow viewports
  (natural scroll direction = progress direction). On desktop, either vertical
  or a horizontal left-to-right flow both work — pick vertical for consistency
  with mobile unless the roadmap is wide/shallow (few top-level branches, many
  children) in which case horizontal reads better. Default to vertical.
- Connecting lines are drawn with SVG (not just border-based tree lines) so
  curves can be used instead of harsh right angles — a bezier curve between
  parent and child center-points reads as a "path" rather than a flowchart.
  Line color follows the completed/upcoming state rule from Section 2.

### Node anatomy (shadcn building blocks: `Card` for the node body, `Checkbox`
or a custom circular check button, `Badge` for optional tags, `HoverCard` or
`Popover` for expanded description/resources)

- Circular or rounded-square node marker showing state (empty ring = locked,
  orange fill + pulse = current, red-violet fill + check = completed)
- Title next to/below marker
- Click/tap expands a `Popover` or inline expand with description + resource
  links, rather than navigating away — the tree should stay the anchor
- Checking a node off updates state optimistically (ties into the
  `progressAtom` from the implementation spec) and animates the connecting
  line to the next node from dashed→solid, orange fading into red-violet as
  the path is completed

### Progress framing

- A slim overall progress bar pinned above the tree (not just per-card in the
  dashboard) — `Progress` component, shows `completed / total`
- Optional: highlight the "current" node distinctly at all times (even after
  scrolling) so the user always knows what's next — this is the single most
  important piece of information the view needs to communicate at a glance

### Large trees

For roadmaps with many nodes: allow branches to collapse/expand (a locked
subtree can start collapsed) so the initial view isn't overwhelming. Use
shadcn `Collapsible`.

---

## 6. Smooth Scrolling (Lenis)

Apply Lenis to any view with meaningful scroll length:
- The dashboard roadmap grid, if the list can grow long
- The roadmap tree view itself — this is the primary candidate, since trees
  can be tall and scroll-driven progression through a path is exactly what
  Lenis' easing suits

Implementation notes for Claude Code:
- Initialize one Lenis instance per scrollable view, tied to a `useEffect` /
  mount lifecycle, and destroy it on unmount — don't leave a global instance
  running across route changes
- Respect `prefers-reduced-motion`: skip Lenis entirely (fall back to native
  scroll) if the user has that preference set
- Keep default easing (Lenis' out-expo default is fine) — don't over-tune
  duration; the point is smoothing, not a slow-motion feel
- Any scroll-triggered reveal on tree nodes (fade/slide in as they enter
  viewport) should be tied to Lenis' scroll event, not a separate
  IntersectionObserver fighting it for control

---

## 7. Motion

Keep it restrained — one orchestrated moment, not scattered effects
everywhere (per frontend-design skill guidance):

- **The one deliberate moment:** when a node is checked complete, the
  connecting line to the next node animates from dashed to solid with the
  orange→red-violet gradient sweeping along it. This is the signature
  interaction — it's what makes checking off a step feel like progress on a
  path rather than a form checkbox.
- Node hover: subtle scale (1.0 → 1.03) and shadow lift, fast (~150ms)
- Card hover on dashboard: subtle lift, no rotation/tilt gimmicks
- Page/tree entrance: nodes can fade+rise into place on scroll (tied to
  Lenis per Section 6), staggered slightly by depth — skip if it starts to
  feel busy with more than ~15 visible nodes at once
- No confetti, no bouncing icons, no gradient hero banners — those read as
  templated rather than intentional for this product

---

## 8. Accessibility

- All node states must be distinguishable by shape/icon, not color alone
  (locked = empty ring, current = filled + pulse ring, completed = filled +
  checkmark icon) — don't rely on orange-vs-red-violet alone for meaning
- Visible keyboard focus ring (`ring` token) on every interactive element:
  node markers, checkboxes, popovers, theme toggle
- Tree must be keyboard-navigable: tab order follows the tree structure
  top-to-bottom / parent-to-child
- Respect `prefers-reduced-motion` everywhere motion is used (Sections 5–7)
- Color contrast: verify `primary`/`secondary` text-on-fill combos meet WCAG
  AA at the specified hexes in both modes before shipping — the lifted dark-mode
  values in Section 2 were chosen for this, but check against final component
  backgrounds

---

## 9. Component Inventory (shadcn)

Pull these via the shadcn skill/CLI as needed — don't hand-build any of them:

`Card`, `Button`, `Badge`, `Progress`, `Checkbox`, `Popover`, `HoverCard`,
`Collapsible`, `Tabs` or `ToggleGroup` (dashboard filters), `DropdownMenu`
(theme toggle, user menu), `Skeleton` (loading states for tree/dashboard
while data loads), `Tooltip` (node quick-info on hover, desktop only).

---

## 10. Build Order

1. Design tokens — set up `globals.css` CSS variables for both modes exactly
   as Section 2, wire shadcn `components.json` theme to use them
2. Theme provider + toggle — confirm dark mode switches every token correctly
   before building anything else on top of it
3. Dashboard shell — top bar, grid, cards with state differentiation, empty state
4. Roadmap tree — static version first (no animation, no Lenis): correct
   structure, correct node states, correct SVG connecting lines
5. Interactivity — expand/collapse, popovers, checkbox toggling wired to
   progress state
6. Lenis — add smooth scroll to tree view (and grid if needed)
7. Motion pass — the node-completion line animation (signature moment),
   hover states, entrance animation
8. Accessibility + reduced-motion pass — verify every item in Section 8