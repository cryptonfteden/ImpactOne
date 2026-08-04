# PIXEL_PERFECT_CHECKLIST.md — Actionable Fix List

**Phase:** DESIGN-PERFECTION-001. Companion to [VISUAL_AUDIT.md](VISUAL_AUDIT.md). Every audit finding restated as a concrete, checkable implementation task, ordered by priority.

---

## Critical (block launch until resolved)

- [ ] **Fix `panelConfig.js`'s hardcoded identity colors** (C1). Reassign `portfolioHealth` and `fearGreed` to neutral hues; drive any green/red exclusively from real, live data (`worldState`'s tone, or each panel's own real value), exactly as `recommendationActionColor()` already correctly does elsewhere in the same file family.
- [ ] **Fix the Feedback-widget / bottom-nav Profile-button overlap at 390px viewport** (C2). Re-verify live in a real browser at 390px width; adjust the widget's fixed position or z-order so both tap targets are fully independent.

## High (fix before or immediately after launch)

- [ ] **Migrate `workspace3d.css`/`flagshipScreen.css` onto the real `--nova-*` token scale** (H1). Replace hardcoded `border-radius: 16px` → nearest governed token (`--nova-radius-lg` at 12px, or propose and formally add a new `--nova-radius-xl` if 16px is genuinely needed); `blur(20px)` → `var(--nova-blur-glass)` (or a disclosed, deliberate override with a stated reason); `999px` → `var(--nova-radius-full)` for literal consistency.
- [ ] **Verify (and if needed, extend) the 3-state loading/empty/error pattern across older NOVA screens** (H2). Spot-check Portfolio Workspace, News Intelligence, and Watchlist Workspace's own loading/empty/error treatments against `FlagshipPanelContent.jsx`'s real 3-state standard; bring any screen still on a flatter pattern up to the same standard.
- [ ] **Re-verify and fix the phone-landscape sidebar-reversion bug** (H3). Long-known; needs a fresh live repro and fix, not further documentation.

## Medium (schedule for the next polish pass)

- [ ] **Implement the display-typeface/tracking treatment for orbital and chain labels** (M1), per `FLAGSHIP_STYLE_GUIDE.md`'s original spec.
- [ ] **Implement the brushed-metal toolbar/panel-header treatment** (M2), per `FLAGSHIP_STYLE_GUIDE.md`.
- [ ] **Run a dedicated icon-sizing consistency pass** (M3) across all real screens — this audit did not have scope to verify this exhaustively; treat as an open verification task, not a confirmed fix.

## Low (backlog, non-blocking)

- [ ] **Apply the rule-of-thirds `OVERVIEW_CAMERA` offset** (L1), per `SPATIAL_COMPOSITION.md`.
- [ ] **Apply the confidence/tone-driven shadow-tint extension** (L2), per `COLOR_GRADING.md`.

## Explicit non-findings (do not "fix" these — they are already correct)

- Hover/focus states on orbital nodes and toolbar controls — already real, correct, and consistent (`fc2dac5`).
- The real `worldState.js` engine's own color/intensity logic — the reference-correct pattern every other color decision in this document set is measured against; do not alter it while fixing C1/H1.
- Camera easing, drag-momentum, and per-status connection-line behavior — already real, purposeful, and correctly implemented; out of scope for this checklist.
