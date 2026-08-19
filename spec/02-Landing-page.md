# Mapify — Landing Page Spec

Scope: **landing page only.** Light mode only — no dark mode toggle on this
page. Not the dashboard, not auth screens (those are separate specs).

Before building, consult `.claude/skills/frontend-design.md` for design
judgment (restraint, one signature moment, real copy) and the shadcn skill
for every component. Don't hand-roll anything shadcn already covers.

---

## 1. Design Brief

Mapify turns a topic into a followable path. The landing page's single job:
make a visitor understand that in about three seconds, then get them to try
it. The hero should not explain this in a sentence — it should *show* it.

**Signature element:** a hero animation of a roadmap path drawing itself —
nodes appearing one at a time along a curved line, as if the page is
generating a roadmap in front of you. This is the one place to spend
animation budget. Everything below the fold stays calm.

**Avoid:** a generic "big headline + stats row + gradient blob" hero — that's
the templated default for this kind of product page. Avoid numbered
feature badges (01/02/03) unless the three features genuinely are sequential
steps — if they're just three independent features, present them as equals,
not a fake sequence.

---

## 2. Design Tokens (light mode only)

Same brand colors as the rest of the app — reuse these exact tokens so the
landing page feels like the same product as the dashboard, not a separate
marketing site:

| Token | Hex | Use |
|---|---|---|
| `background` | `#FFFFFF` | page background |
| `foreground` | `#1A1218` | body text |
| `muted` | `#FFF3F0` | section backgrounds for alternating rows |
| `muted-foreground` | `#6B5A5F` | secondary text, captions |
| `primary` | `#FF5841` | primary CTA, active path segments |
| `primary-foreground` | `#FFFFFF` | text on primary |
| `secondary` | `#C53678` | secondary accents, completed path segments |
| `secondary-foreground` | `#FFFFFF` | text on secondary |
| `accent` | `#FDE7E0` | hover backgrounds, subtle highlights |
| `border` | `#F0DEE2` | dividers, card borders |
| `ring` | `#FF5841` | focus ring |

**Typography:** pick a display face with some character for the headline
(not the default system sans) paired with a clean, neutral body face for
readability — e.g. a display face with a slightly condensed or geometric
feel for headlines, paired with Inter or similar for body copy. Set a clear
scale: headline, subhead, body, caption. State the actual pairing chosen
before implementation (this is a judgment call for whoever implements —
flag it, don't default silently to Inter-for-everything).

---

## 3. Page Structure

```
┌───────────────────────────────────────────┐
│ Nav: logo, [Sign in] [Get started]         │
├───────────────────────────────────────────┤
│ HERO                                       │
│  Headline + subhead + CTA, left/center     │
│  Roadmap-drawing animation, right or below │
├───────────────────────────────────────────┤
│ HOW IT WORKS ("help of using roadmap")     │
│  3 steps: enter topic → get roadmap → track│
│  progress. This IS sequential — numbering  │
│  is earned here.                           │
├───────────────────────────────────────────┤
│ WHY IT HELPS (benefits, not features list) │
│  e.g. structure vs. scattered tutorials,   │
│  visible progress, follows your pace       │
├───────────────────────────────────────────┤
│ EXAMPLE ROADMAP PREVIEW                    │
│  A real static mock of a tree (e.g. "Learn │
│  React") to make the product concrete      │
├───────────────────────────────────────────┤
│ FINAL CTA                                  │
├───────────────────────────────────────────┤
│ FOOTER                                     │
└───────────────────────────────────────────┘
```

---

## 4. Hero Animation (roadmap-related, animation library)

**Library:** Framer Motion (`motion` package) for entrance/orchestration,
combined with SVG `stroke-dashoffset` animation for the path-drawing effect.
Framer Motion is the right fit here over GSAP — it's React-native, works
cleanly with component mount/unmount, and this animation doesn't need GSAP's
heavier timeline/plugin features.

**Sequence (runs once on load, ~1.5–2s total, respects
`prefers-reduced-motion` by showing the end-state immediately with no
animation if set):**

1. An SVG curved path draws itself left-to-right (or top-to-bottom on
   mobile) via `stroke-dashoffset` animating from full length to 0
2. As the drawing line passes each node position, that node pops in
   (`scale: 0 → 1`, spring easing) — 3–5 nodes total, alternating fill
   between `primary` and `secondary` so both brand colors appear in the
   first thing a visitor sees
3. Last node settles with a small label like "You" or a destination icon,
   giving the animation a clear endpoint — the path has to visibly *arrive*
   somewhere, not just trail off
4. On loop/idle (optional, subtle): the completed path very slowly pulses
   once every several seconds — not a repeating draw, just a faint
   breathing glow, so the hero doesn't feel static but also doesn't distract
   from someone reading the headline next to it

Keep it to one hero animation. Don't also animate the nav, don't also
animate the section below on load — motion elsewhere on the page should be
scroll-triggered only (Section 5), not autoplaying.

---

## 5. Smooth Scroll + Scroll Animation

- **Lenis** for smooth scrolling across the whole page. Single instance,
  initialized on mount, destroyed on unmount, skipped entirely if
  `prefers-reduced-motion` is set (fall back to native scroll)
- Section entrances (How it works steps, benefit cards, roadmap preview) use
  Framer Motion's scroll-triggered `whileInView` — fade + slight rise,
  staggered by a small delay per item within a section. Keep the same easing
  and duration across every section so it doesn't feel like different
  animation systems were bolted on in different places
- Nothing scroll-triggered should re-animate every time it re-enters
  viewport on scroll-up — trigger once, stay settled

---

## 6. Content

Write from the visitor's side, plain and direct — no filler, no "revolutionize
your learning journey" marketing voice. Draft copy below; treat as a strong
starting point Claude Code can refine, not literal final copy to lock.

**Nav:** Mapify · Sign in · Get started

**Hero headline:** "Any topic. A clear path to learn it."
**Hero subhead:** "Type in what you want to learn. Get a roadmap, not a
search results page — and track your way through it, step by step."
**Hero CTA:** "Build your roadmap" (primary button) · "See an example"
(ghost/secondary, scrolls to preview section)

**How it works (3 steps, numbered — this section earns it):**
1. **Tell it what you want to learn** — a topic, a skill, a subject. As
   specific or as broad as you want.
2. **Get a roadmap, not a list** — the path breaks the topic into an order
   that actually makes sense, with resources at each step.
3. **Check off your progress** — see exactly where you are and what's next,
   instead of losing your place across a dozen open tabs.

**Why it helps (benefit framing, not a feature list):**
- "Structure instead of scattered tutorials" — one path instead of ten
  open browser tabs and no idea what order to do them in
- "Always know what's next" — progress tracking means you never lose your
  place if you step away for a week
- "Built for how you actually learn" — [placeholder: fill in with a real
  differentiator once decided — e.g. adaptive difficulty, resource curation
  quality, etc. Don't ship a vague third bullet just to make it three.]

**Example roadmap preview section heading:** "What a roadmap actually looks
like" — followed by the static tree mock.

**Final CTA:** "Stop guessing what to learn next." → "Build your roadmap" button

**Footer:** logo, minimal links (About, Contact, GitHub if public), no
newsletter signup unless that's a real feature.

---

## 7. Components (shadcn)

`Button`, `Card` (benefit cards, example roadmap preview container),
`Separator`, `Tooltip` (optional, on example roadmap nodes), `Badge`
(optional, small "New" or category tags if needed). Reuse the same `Button`
variants/styles that the dashboard uses — this page should look like it
belongs to the same product, not a separately-designed marketing site.

---

## 8. Accessibility

- `prefers-reduced-motion`: hero animation shows final state immediately, no
  stroke-draw; Lenis disabled, falls back to native scroll; scroll-triggered
  reveals show content in place with no motion
- Sufficient contrast for body text on `background` and `muted` — verify
  `foreground` (#1A1218) and `muted-foreground` (#6B5A5F) against both
  before shipping
- All CTAs are real `<button>`/`<a>` elements with visible focus rings
  (`ring` token), not divs with click handlers
- Hero animation is decorative — mark its SVG `aria-hidden="true"` and make
  sure the headline/subhead alone convey the same meaning without it

---

## 9. Build Order

1. Tokens + typography setup (Section 2) — confirm against existing
   dashboard tokens so nothing drifts
2. Static layout, all sections, real copy, no animation — get structure and
   content right first
3. Static "example roadmap" mock section
4. Lenis smooth scroll wired in
5. Scroll-triggered section reveals (Framer Motion `whileInView`)
6. Hero animation — the signature moment, built and tuned last since it's
   the most fiddly piece
7. Reduced-motion + accessibility pass (Section 8)
8. Responsive pass — mobile hero likely needs the animation stacked above
   or below text rather than beside it; confirm it still reads clearly at
   narrow widths