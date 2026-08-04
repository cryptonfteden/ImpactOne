# VISUAL_AUDIT.md — The Full, Itemized Review

**Phase:** DESIGN-PERFECTION-001. Companion to [DESIGN_PERFECTION.md](../../design/DESIGN_PERFECTION.md). Every one of the mission's 20 named audit categories, addressed explicitly. Each finding cites its real evidence and its confidence level.

---

## CRITICAL

### C1. Color-semantics violation in `panelConfig.js` — now confirmed across 5 consecutive design phases

**Category**: Consistency, Contrast/Color. **Evidence**: `frontend/src/features/flagshipScreen/panelConfig.js` — `portfolioHealth: color: "#4fffb0"` (green), `fearGreed: color: "#ff5f5f"` (red), hardcoded as permanent panel-identity colors regardless of real data. **First identified**: `FLAGSHIP_COMPONENT_SPEC.md` (FLAGSHIP-UI-001). **Re-confirmed unfixed**: `PREMIUM_POLISH.md`, `BRAND_VISUAL_RULES.md`, `COLOR_GRADING.md`, and directly this phase (re-checked via grep, still present, untouched by `2cd5d5b`'s otherwise-relevant `worldState.js` consolidation). **Why Critical**: this is not a subjective preference — it directly contradicts a rule this platform's own real, shipped `worldState.js`/`recommendationActionColor()` correctly implements elsewhere in the same codebase, meaning the product now visibly contradicts its own established convention in one specific, easily-noticed spot (the Portfolio Health and Fear & Greed nodes never change color regardless of real market condition, while every other node's color logic in the same scene is correctly data-driven).

### C2. Feedback-widget / bottom-nav Profile-button overlap at narrow viewport

**Category**: Alignment, Component sizing, Spatial layout at breakpoint. **Evidence**: confirmed live in a real browser walkthrough during `COMMERCIAL-READINESS-001` at a 390px viewport — the floating Feedback widget and the bottom-nav's Profile button occupy overlapping tap targets. **Status**: confirmed found, not yet fixed as of this phase (not independently re-tested this session; carried forward as a known, real, disclosed defect). **Why Critical**: a real, physically overlapping tap target on the most common mobile viewport width is a functional accessibility failure, not merely an aesthetic one — a user cannot reliably tap the intended control.

## HIGH

### H1. The entire 3D Workspace/Flagship visual system bypasses the real, governed design-token system

**Category**: Consistency, Corner radii, Shadows, Glass/Blur. **Evidence, confirmed this phase via direct grep**: `frontend/src/features/workspace3d/` and `frontend/src/features/flagshipScreen/` contain **zero** references to `var(--nova-*)` anywhere across their CSS — every radius, blur, and shadow value is a hardcoded magic number. Meanwhile `frontend/src/styles/tokens.css` defines a real, governed scale these values should draw from: `--nova-radius-sm: 4px`, `-md: 8px`, `-lg: 12px`, `-full: 9999px`; `--nova-blur-glass: 24px`; `--nova-elevation-0/1/2`. Concrete mismatches found: `workspace3d.css`'s glass panel uses `border-radius: 16px` (matches no defined token — falls between `-lg` at 12px and nothing above it), `backdrop-filter: blur(20px)` (vs. the real, governed `24px` glass-blur token), and `border-radius: 999px` for pills (functionally equivalent to but a different literal value than `--nova-radius-full: 9999px`). **Why High, not Critical**: none of these mismatches are visually broken or user-facing-incorrect — they are governance/consistency debt that will compound with every future screen built the same way, exactly the kind of gap `DESIGN_TOKENS.md`'s own stated governance rule ("no token is ever silently redefined... nothing hardcoded") exists to prevent.

### H2. The newest screen's 3-state (loading/empty/error) treatment has not been verified to extend to older screens

**Category**: Loading states, Empty states, Error states, Consistency. **Evidence**: `FlagshipPanelContent.jsx` (post-`fc2dac5`) correctly renders 3 visually distinct states — a real shimmer skeleton, a calm empty state, and a distinct error state — a genuine, real improvement over the flat single-state pattern this platform previously used elsewhere. **Not independently verified this phase**: whether every older, pre-existing NOVA screen (Portfolio Workspace, News Intelligence, etc.) has an equivalently distinct 3-state treatment, or still uses the older, flatter pattern this whole engagement's own history suggests was the prior norm. **Why High, not Critical**: if the older screens are still on the flatter pattern, a user moving between the Flagship screen and an older screen would feel an inconsistent level of polish — not a functional bug, but a real "Stripe-standard" consistency failure if confirmed.

### H3. Phone-landscape sidebar-reversion bug

**Category**: Layout consistency (an existing defect, not a new layout — the mission's "no new layouts" constrains new work, not documenting known regressions). **Evidence**: long-known, referenced across multiple prior phases in this engagement's own accumulated findings; not independently re-tested this phase. **Why High**: a real, reproducible layout defect on a real device orientation, long-standing and never fixed.

## MEDIUM

### M1. Typography treatment specified but not implemented

**Category**: Typography, Visual rhythm. **Evidence**: `FLAGSHIP_STYLE_GUIDE.md` (FLAGSHIP-UI-001) specified a dedicated display typeface with defined tracking for orbital/chain labels; confirmed this phase that `workspace3d.css`'s real label classes still use only size/weight, no dedicated face or tracking rule — this remains an open, disclosed item across 3 subsequent phases without implementation.

### M2. Brushed-metal material treatment specified but not implemented

**Category**: Materials, Consistency. **Evidence**: `FLAGSHIP_STYLE_GUIDE.md` specified brushed-metal chrome scoped to the toolbar/panel-header only; the real toolbar (`workspace3d.css`'s `.workspace3d-toolbar__button`) remains a plain translucent pill. **Why Medium, not High**: this creates a mild materials inconsistency (the Earth got real clearcoat physical material, the glass panels got layered depth, but the toolbar chrome received none of the same "premium materials" pass) but does not create user confusion or a functional issue.

### M3. Icon sizing consistency — not independently verified this phase

**Category**: Icon sizing. **Honest disclosure**: this audit did not exhaustively inspect every icon component across all ~25 real screens in the time available; no specific inconsistency is claimed here. This item is listed to be transparent about audit scope, not to assert a defect that hasn't been confirmed — flagged as a recommended follow-up verification pass, not a finding.

## LOW

### L1. Rule-of-thirds camera composition offset (specified, not implemented)

**Category**: Visual balance, Composition. From `SPATIAL_COMPOSITION.md` (HOLLYWOOD-FINISH-001) — a proposed, disclosed refinement, not yet applied to `OVERVIEW_CAMERA`.

### L2. Confidence-driven shadow-tint tone extension (specified, not implemented)

**Category**: Color grading. From `COLOR_GRADING.md` (HOLLYWOOD-FINISH-001) — the shadow-zone indigo-tint shift tied to `worldState`'s tone, not yet applied.

## Categories audited with no new finding beyond what's already documented above

**Alignment, Spacing, Contrast, Motion, Hover, Focus, Scroll behavior**: the real, shipped 3D Workspace/Flagship system's own recent polish passes (`fc2dac5`, `4c7670b`) already introduced genuine, correct hover/focus states (`:focus-visible` outlines, eased hover scale) and purposeful motion — no new defect found in these categories this phase beyond the token-governance issue already listed under H1 (which is a *values* problem, not a *presence* problem — the states exist and behave correctly, they simply aren't sourced from the governed token scale).
