# PREMIUM_REFINEMENTS.md — What Was Fixed, What Was Deliberately Left Alone, and Why

**Phase:** CINEMATIC-POLISH-003. Companion to [CINEMATIC_POLISH_3.md](CINEMATIC_POLISH_3.md) and [VISUAL_CONSISTENCY_REPORT.md](VISUAL_CONSISTENCY_REPORT.md).

## Fixed this phase

### 1. Missing transition timing on `.nova-button`, `.nova-card`, `.nova-toggle`, `.nova-toggle__thumb`

**File**: `frontend/src/styles/components.css`. **What changed**: added `transition-duration: var(--nova-motion-duration-standard); transition-timing-function: var(--nova-motion-curve-hover);` to all four rules — values already established elsewhere in the codebase (Flagship's own `.workspace3d-toolbar__button`), not invented for this fix. **Why objectively justified**: each rule already declared a `transition-property` list — a `transition-property` with no duration is, per the CSS spec, functionally a no-op (the browser still applies the *end* state, just with zero animation). Adding the missing half of an already-declared, already-intended transition is a correctness fix, not a design decision — it makes the code do what it already claimed to do. **What did not change**: no color, spacing, radius, layout, or component structure changed. No JSX file was touched. **Verification**: 615/615 frontend tests passing; production build clean; the fix reaches every Workspace screen automatically since `Card`/`IntelligenceCard`/`HeroCard` and `Button` are shared components, not per-screen implementations.

## Considered and deliberately NOT implemented (with reasons)

### 2. Entrance/mount animation for `Card`/`IntelligenceCard` instances

**What was found**: Flagship's glass panel and Mission Control's `HeroCard` both play a real one-time entrance animation on mount; the smaller, more numerous `Card`/`IntelligenceCard` instances used throughout every Workspace screen do not. **Why not fixed**: adding a mount animation to every card on every screen is a visible behavior change that would be noticed on first paint across the whole product at once — closer to "add a new motion concept" than "restore an already-declared one" (unlike the transition-duration fix above, there is no existing-but-inert declaration to complete here; this would be new code). The mission's "no redesign" boundary is best respected by not making this call unilaterally. **Recommendation for a future phase**: if pursued, reuse the exact `mc-stagger-in`/`mc-hero-pulse` keyframes already defined in `components.css` (do not define a third animation) and stage it behind a deliberate decision about which cards should NOT animate (e.g. cards already visible before a scroll, to avoid re-triggering on every scroll into view).

### 3. Hover-state shadow deepening on `.nova-card`

**What was found**: `.nova-card`'s hover-lift (`translateY(-2px)`) includes `box-shadow` in its transition-property list, but no distinct hover shadow value exists to transition to — elevation is fixed per the `Panel` component's `data-elevation` prop, not adjusted on hover. **Why not fixed**: correctly wiring this means choosing a specific deeper shadow value per elevation tier (e.g., what should elevation-1 lift to on hover — elevation-2's shadow, or a new intermediate value?) — a real, if small, design decision rather than a pure execution correctness fix. **Recommendation for a future phase**: define the hover-target shadow explicitly (most likely: elevation-N's card lifts to elevation-(N+1)'s shadow token on hover) and treat it as a deliberate, disclosed design choice, not bundled into an "invisible" execution-only pass.

### 4. Glass material applied to Workspace-screen cards

**What was found**: Flagship uses real glass (`backdrop-filter: blur`); Workspace-screen cards use opaque `elevation="1"/"2"` surfaces. **Why not fixed**: this is not a defect — it is `NOVA_DESIGN_BIBLE.md`'s own already-audited, already-confirmed-sound rule that glass is reserved for Level-3 surfaces (modals/drawers) only. Applying it to ordinary cards would be a redesign, and would degrade glass's value as a deliberately reserved accent (a documented anti-pattern this same engagement has flagged before: over-applying an accent effect until it stops signaling anything). **No future action recommended** — this is working as intended.

### 5. Multi-layer contact-shadow/reflection treatment on Workspace-screen cards

**What was found**: Flagship's floating panel has a 4-layer shadow (grounding contact shadow, inset highlight, top-edge reflection line, base token); NOVA's opaque cards have one shadow layer. **Why not fixed**: the 4-layer treatment exists specifically because a translucent object floating over a 3D scene needs extra visual grounding that an opaque card sitting on a flat page background does not need — replicating it everywhere would be visual noise without a structural reason, and risks looking like decoration for its own sake rather than intentional depth. **No future action recommended.**

### 6. `.nova-skeleton`'s shimmer duration (`1600ms` hardcoded vs. the existing `--nova-motion-duration-ai-thinking-loop` token, `1800ms`)

**What was found**: the shared loading-skeleton shimmer uses a hardcoded `1600ms` duration rather than the semantically-matching existing token. **Why not fixed**: a prior phase's own code comment explicitly records a deliberate decision to leave duration/timing untouched at this exact spot ("Keyframes/duration/timing-function unchanged, per the mission's 'keep the same animation' constraint") while fixing a contrast issue in the same rule. The visual difference between 1600ms and 1800ms in a continuous shimmer loop is imperceptible, and overriding a documented prior decision without a strong, specific reason risks looking like unreviewed churn rather than a real improvement. **Logged as a very-low-priority, optional cleanup**, not acted on.

## The standard applied when deciding fix vs. no-fix

Every item above was tested against one question: *does completing this require only supplying a missing value the code already declares an intent for (safe, objective), or does it require choosing a new value/behavior that didn't exist before (a small design decision, out of scope for an execution-only pass)?* Item 1 passed that test cleanly; items 2–6 did not, and are documented rather than force-fit into a fix.
