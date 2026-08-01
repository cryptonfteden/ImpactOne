# UI Debt Report — FINAL-UI-UNIFICATION-001

What remains, prioritized, for whoever picks up the next round of Nova migration work.

## Real, Disclosed Remaining Debt (Not Fixed This Phase, and Why)

1. **Text-color reconciliation** (`--text-0/1/2`, `--h3-text-primary/secondary` vs. Nova's text-primary/secondary/tertiary) — the highest-leverage remaining item (touches nearly every screen's body copy), deliberately not forced through an approximate substitution. Needs a real design decision (which exact value is "correct") backed by visual verification, not a mechanical token swap.
2. **Status colors** (`--success`/`--danger`/`--h3-positive`/`--h3-negative`/`--h3-warning` vs. Nova's positive/negative) — same caveat, narrower surface area (badges, deltas, pills).
3. **Glass surface colors** (`--glass`, `--glass-border`) — a genuine **token-coverage gap**, not a mismatch: Nova has no rgba surface-color token for this at all yet. This is a decision for whoever owns the Nova token set (does one get added, and what should its exact value be?), not something this phase's scope could resolve on its own.
4. **The `theme.js` JS/CSS boundary duplicate** — disclosed in `NOVA-MIGRATION-001`'s `LEGACY_UI_REMAINING.md`, still unresolved. Requires understanding `theme.js`'s real consumption path before it can be safely touched.
5. **`--h3-radius-*` scale** — no exact Nova equivalents exist at `10px`/`16px`/`22px`; either Nova's radius scale needs a new step, or a real design decision to converge these onto the nearest existing Nova step is needed.

## Real Debt Actually Paid Down This Phase

- 2 more exact-match variable aliases (spacing).
- 1 exact-match shadow alias, benefiting every card-styled surface in the app at once.
- 1 confirmed, verified-safe dead-code removal (a fully-unreachable duplicate CSS rule) — a genuine simplification with zero behavioral risk, found by the same rigor applied to finding exact-match aliases.

## The Real Lesson From This Phase's Dead-Code Find

The `.glass-card` duplicate-declaration bug is worth calling out specifically: it's evidence that this legacy stylesheet has accumulated real, un-intentional duplication over its many "Sprint"/"Phase" eras beyond just "the same color typed twice" — a full future audit should specifically grep for **any class name declared more than once** in `styles.css` (not just the ones already found by chance while investigating shadow values) as a real, mechanical way to find more of this same class of dead-code bug. This phase did not perform that full, systematic sweep — it found this one instance while investigating a different, unrelated question (the card shadow's exact-match status) and is disclosing the technique as a real, recommended next step rather than claiming to have already applied it exhaustively.

## Test Coverage for This Class of Change

Consistent with `VISUAL_UNIFICATION.md`'s established guidance: the alias-only changes in this phase are provably zero-risk (identical computed values) and covered sufficiently by the existing behavioral test suite plus the production build succeeding. The dead-code removal was verified by manual property-by-property comparison between the two `.glass-card` rules (documented in `FINAL_UI_UNIFICATION.md`) rather than a new automated test, since the "removed code never rendered anything different" property isn't naturally expressible as a behavioral assertion — a future systematic duplicate-selector sweep (per the recommendation above) would be the right place to add a real, automated regression test (e.g., a CSS-source-scanning test asserting no class selector is declared more than once, the same "read the real source, assert its structure" technique established in `MOBILE-FIXES-001`).

## Verification Summary

- Full frontend regression suite: run per this phase's explicit requirement — see the commit for the exact pass count.
- Production build: succeeded.
- No component structure, behavior, navigation, or accessibility attribute was touched this phase — every change is a CSS custom-property value or a confirmed-dead CSS rule.
