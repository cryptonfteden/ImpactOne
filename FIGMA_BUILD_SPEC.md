# Figma Build Specification — Phase X1 (Part 6)

Design-only. Written so a designer can recreate the complete product in Figma without asking a follow-up question. References `DESIGN_LANGUAGE.md` for every token value and `SCREEN_BLUEPRINTS.md` for every screen's content/behavior — this document is the *file structure and build order*, not a restatement of either.

---

## 1. File & Page Structure

One Figma file, pages in this exact order (top of the pages panel to bottom):

1. **📐 Foundations** — color styles, text styles, effect styles (shadows/blur), spacing/grid documentation frames. Built first; nothing else references anything until this page is complete.
2. **🧩 Components** — every reusable component from §3 below, organized in labeled sections (Buttons, Cards, Inputs, Nav, Pills/Status, Modals, Notification). Built second.
3. **📱 Screens — Mobile** — one frame per screen per state (§5).
4. **🖥️ Screens — Desktop** — one frame per screen per state (§5).
5. **🔄 Flows** — the user-journey map from `PRODUCT_EXPERIENCE_BLUEPRINT.md` Part 2, laid out as connected frames with Figma prototype links (arrows), one flow diagram per major journey (Onboarding → Today; Today → Markets → AI → Workspaces loop; a triggered-alert → Notification → source-screen flow).
6. **📝 Handoff Notes** — any open questions or designer judgment calls made during the build, logged here rather than left ambiguous in the design itself.

## 2. Figma Variables (Foundations page)

Create a single variable collection, **"ImpactOne / Core"**, with two modes: **Dark** (default, ships first) and **Light** (defined but not required to ship this phase — reserve the mode now so it's not a breaking change later). Variable groups, named exactly as follows so downstream component bindings stay stable:

- `color/void`, `color/surface`, `color/surface-raised`, `color/border`, `color/border-strong`
- `color/text-primary`, `color/text-secondary`, `color/text-tertiary`
- `color/accent`, `color/accent-strong`
- `color/positive`, `color/negative`, `color/warning`
- `space/1` (4) through `space/8` (64), per `DESIGN_LANGUAGE.md`'s spacing scale
- `radius/sm` (10–14), `radius/md` (16), `radius/lg` (20–22)

Every component in §3 binds its fills/strokes/spacing to these variables — never a hard-coded hex or pixel value on any layer. This is the single highest-leverage rule in this spec: it's what makes the whole file re-themeable and consistent without per-screen fixes.

## 3. Component Library (build in this order)

1. **Text styles** — one style per row in `DESIGN_LANGUAGE.md`'s typography scale, named `Text/Hero`, `Text/H1`, `Text/H3`, `Text/Eyebrow`, `Text/Body`, `Text/Body Subtle`, `Text/Caption`, plus `Text/Numeric` variants of Body/H1/Hero using the tabular/mono numeric face.
2. **Button** — variants: `Primary`, `Ghost`, `Destructive` × states `Default`, `Hover`, `Disabled` × sizes `Default`, `Small`. Auto-layout, hug contents horizontally, fixed height 40px (Default) / 32px (Small).
3. **Input** — variants: `Text`, `Number`, `Select` × states `Default`, `Focus`, `Error`. Include the label slot above and error-text slot below as part of the component, not separate manually-placed layers.
4. **Status Pill** — variants: `Positive`, `Negative`, `Warning`, `Neutral`. Auto-layout, hug contents, fixed 24px height.
5. **Card / Panel** — the base glass card as a single component with a boolean prop `Header` (on/off) and a content slot. All screen cards in §5 are instances of this, never redrawn.
6. **Nav Rail (desktop)** and **Bottom Nav (mobile)** — each a component with 5 pillar-icon slots + active-state boolean per slot, matching the pillar order Today/Markets/Portfolio/Workspaces/AI exactly.
7. **Notification Bell + Badge** — component with a numeric badge slot, badge visibility boolean.
8. **Modal / Overlay** — base component: dimmed backdrop + centered glass card + title slot + content slot + action-row slot.
9. **Skeleton (loading)** — a component per major shape needed: `Skeleton/Card`, `Skeleton/Line`, `Skeleton/Hero`, each with the shimmer effect style applied (documented as an Effect Style, not manually drawn per instance).
10. **Empty State** and **Error State** — components with icon slot, title slot, message slot, optional action-button slot — matching every screen blueprint's empty/error requirements exactly.
11. **Chart primitives** — `Chart/Line` and `Chart/Sparkline` components (per `DESIGN_LANGUAGE.md`'s chart guidance) with a data-driven placeholder path, accent-colored by default, swappable to positive/negative via variant.
12. **Table row** — a single `Table/Row` component (header variant + data variant) — reserve real table use for the two blueprints that explicitly need it (Portfolio positions, trade history).

## 4. Frame Sizes

- **Mobile**: 390×844 (iPhone 14/15 baseline — covers the mission's mobile-behavior requirement at a standard, testable size).
- **Desktop**: 1440×1024 (standard laptop baseline; content itself caps at the grid's max-width per `DESIGN_LANGUAGE.md`, so the frame can scroll vertically as needed).

Every screen frame uses Figma auto-layout for its vertical card stack, so reordering or adding a card (e.g., a future sixth Today card) never requires manual repositioning.

## 5. Screen Frames — Full Build List

For every screen in `SCREEN_BLUEPRINTS.md`, build **both** Mobile and Desktop, **each** in these four states (16 frames minimum per screen, 5 screens + Notification + Onboarding = 7 screens × 16 = 112 frames total, plus the Flows page's connective frames):

1. **Populated** (the primary, realistic-data state — this is the one used in the Flows prototype links)
2. **Empty** (per that screen's blueprint)
3. **Loading** (skeleton state)
4. **Error** (per that screen's blueprint)

Naming convention, exactly: `[Pillar]/[Platform]/[State]` — e.g. `Today/Mobile/Populated`, `Portfolio/Desktop/Error`, `Workspaces/Mobile/Empty`. This naming is what keeps the Screens pages navigable without a designer needing to ask "which frame is the loading state for X."

### Per-screen build notes (beyond what's in `SCREEN_BLUEPRINTS.md`)

- **Today**: build the adaptive card stack as 6 real card instances in a fixed demonstration order (the actual order is server-driven, not a Figma concern) — always include the Active Alerts card as the last instance so its position in the hierarchy is unambiguous to whoever builds it in code later.
- **Markets**: build one card in its expanded (in-place) state as a *separate, explicitly labeled* frame variant (`Markets/Desktop/Populated — Expanded Card`) so the Wow Moment's before/after is documented, not just described.
- **Portfolio**: hero metric strip is a distinct auto-layout row component, not part of the page background — needs to be reusable if a condensed version is ever needed elsewhere.
- **Workspaces**: build the drag-move interaction as an annotated flow (two frames + an arrow + a text annotation describing the drag), since Figma can't natively demonstrate a drag gesture — put this specific annotation on the Flows page, not the Screens page.
- **AI**: build the committee-streaming Wow Moment as a 3-frame sequence (member 1 reasoning visible → member 2 joins → synthesized verdict resolves) on the Flows page, connected with prototype "after delay" transitions so it can be presented as a real clickable/playable demo.
- **Notification Center**: build both the collapsed badge state and the open-panel state as separate frames; the "highlight ring" Wow Moment gets its own annotated 2-frame sequence on the Flows page (badge tapped → destination card highlighted).
- **Onboarding**: build the step sequence as a horizontal frame row (one frame per step, left to right, matching the existing product's real step count) with prototype arrows connecting them in order — this becomes the literal build reference, since the mission asks for zero ambiguity.

## 6. Prototype Links (Flows page)

Wire every transition from `PRODUCT_EXPERIENCE_BLUEPRINT.md`'s transition table as a real Figma prototype connection between the relevant Populated frames, using the "Smart Animate" transition type set to 300ms ease-out (matching `DESIGN_LANGUAGE.md`'s screen-transition duration) — so clicking through the prototype in Figma's Present mode demonstrates the actual intended motion, not just a hard cut between static frames.

## 7. Handoff Checklist

Before this file is considered complete and ready for engineering handoff:
- [ ] Every color/spacing/radius value in every frame is bound to a Foundations variable — zero hard-coded values (verify via Figma's "missing variables" check).
- [ ] Every screen has all 4 states × 2 platforms built (112-frame minimum met).
- [ ] Every component in §3 has been used at least once in the Screens pages (no orphaned, unused components).
- [ ] Every transition in the Part 2 transition table has a corresponding prototype link on the Flows page.
- [ ] Accessibility contrast has been checked against the actual Foundations colors (using Figma's contrast-checking plugin or equivalent) for every text-on-background pairing used.
- [ ] Handoff Notes page contains a logged entry for every place a designer had to make a judgment call not explicitly covered by `SCREEN_BLUEPRINTS.md` or `DESIGN_LANGUAGE.md` — the goal is zero silent assumptions.
