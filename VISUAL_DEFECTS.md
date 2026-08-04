# VISUAL_DEFECTS.md — Itemized Findings

**Phase:** DESIGN-PERFECTION-001. Companion to [DESIGN_PERFECTION.md](DESIGN_PERFECTION.md). Every finding cites its real evidence, current status, and confidence level. Re-verified fresh at HEAD `e336923` (plus this phase's own one fix) — nothing here is carried forward from an earlier audit without being re-checked.

---

## FIXED THIS PHASE

### F1. `.header-controls` forced into a vertical column on landscape phones

**Category**: Alignment, Density, Spatial layout at breakpoint. **Evidence**: `frontend/src/styles.css`'s `@media (max-width: 980px)` rule (original "Sprint 5" commit `a5b9251`, confirmed via `git log -L`) sets `.header-controls { flex-direction: column; width: 100%; }` and `.search-box { min-width: 100%; }`. This rule is width-only and also matched a real 844×390 landscape phone (844px < 980px), stacking the search bar, market-status pill, and all 4 header icon buttons into one tall vertical list — confirmed live via screenshot before the fix. **Root cause**: the rule assumes "narrow width implies limited horizontal room, so stack vertically" — true for a narrow desktop window, false for a landscape phone, which has width to spare and almost no height to spare. **Fix**: added a `.header-controls`/`.search-box` override inside the already-established `@media (orientation: landscape) and (max-height: 500px)` block (the same breakpoint `MOBILE-FIXES-001` introduced for the bottom-nav), restoring the row layout for that one case only. **Verified**: 844×390 now renders one clean horizontal row (confirmed via screenshot); 390×844 portrait and 900×700 narrow-desktop are pixel-identical to before the change (confirmed via screenshot at both). Full regression 615/615 passing.

## CRITICAL

### C1. The legacy-vs-Nova two-tier visual language

**Category**: Consistency (the mission's own "every screen should feel designed by the same team" test, failed). **Evidence**: `frontend/src/styles.css` (the pre-Nova system, ~3,300 lines) contains 250+ raw hardcoded hex colors (`#111827`, `#1f2937`, `#0f172a`, `#60a5fa`, `#4ade80`, `#f87171`, etc. — a Tailwind-slate-adjacent palette) with **zero** references to any `--nova-*` token. By contrast, `frontend/src/styles/components.css` (the real Nova design-system stylesheet) has **zero** hardcoded hex colors, blur values, or easing curves — it is 100% token-driven (confirmed via grep, both counts exact). Live-confirmed via side-by-side screenshots this phase: the Recommendations screen (pre-Nova) renders as a dense, flat, sharp-edged card grid with saturated flat pill colors and tight spacing; the Portfolio Workspace screen (Nova) renders as a spacious, glass-bordered, rounded-corner layout with a clear single-hero-number hierarchy and generous whitespace. These are visibly, unmistakably two different design languages on the same product, reachable one click apart in the same sidebar. **Scope**: confirmed to affect roughly 11 of ~24 real sidebar screens (Recommendations, Daily Feed, Themes, Alerts, AI Analysis, Global Intelligence, Market Dashboard, Market Positioning, Decision Timeline, plus others not individually re-verified this phase). **Why Critical, not High**: this is not a subtle inconsistency — a user moving between screens experiences a visibly different product, which directly fails the mission's own "designed by the same team" standard, and it is large enough in scope that no small fix addresses it. **Why not fixed this phase**: migrating ~11 screens' worth of hand-authored CSS onto Nova tokens is a multi-file, multi-screen visual migration — the same category of work `804462e` scoped narrowly to the 3D layer alone, explicitly disclosing the rest of `styles.css` as out of scope. Attempting it here would exceed this mission's "no redesign" boundary (a real risk of visually changing screens beyond "perfecting" their existing execution). Documented, not implemented.

## HIGH

### H1. No general-purpose fix exists for narrow-width header density without redesign

**Category**: Density, Spacing. **Evidence**: beyond the landscape-phone case fixed this phase, the header row (search box + market pill + 4 icon buttons) is inherently tight at any width under roughly 900–1000px in *portrait* orientation (where the column-stack fallback is the deliberate, reasonable choice) — confirmed live at 900×700. A more spacious treatment (e.g., collapsing the 4 icon buttons into a single overflow menu at narrow widths, or shrinking icon hit targets) would be a real improvement but is a new interaction pattern, not a pure visual-execution fix, and is explicitly out of scope for a "no redesign, no feature changes" mission. Documented as a recommended follow-up, not implemented.

## MEDIUM

### M1. Typography treatment specified but not implemented

**Category**: Typography, Visual rhythm. **Evidence, re-confirmed this phase**: `FLAGSHIP_STYLE_GUIDE.md` specifies a dedicated display typeface with defined tracking for orbital/chain labels; `workspace3d.css`'s real label classes (`.workspace3d-node-label`, `.workspace3d-chain-label`) still use only `font-family: inherit` plus size/weight — no dedicated face or letter-spacing rule exists (confirmed via grep for `font-family|letter-spacing` in the file — only one `font-family: inherit` match). Unimplemented across 3 subsequent phases now.

### M2. Brushed-metal toolbar treatment specified but not implemented

**Category**: Materials, Consistency. **Evidence, re-confirmed this phase**: `FLAGSHIP_STYLE_GUIDE.md` specifies brushed-metal chrome scoped to the toolbar/panel-header. The real `.workspace3d-toolbar__button` rule (read in full this phase) is a plain translucent pill (`background: rgba(20, 30, 60, 0.45); backdrop-filter: blur(10px);`) with a hover/active/focus state but no metallic gradient or sheen. **Why Medium, not High**: a real, mild materials inconsistency (the Earth has real clearcoat physical material; the glass panels have real layered depth; the toolbar chrome has neither) but doesn't create confusion or a functional issue. Left unimplemented deliberately this phase — adding a new material treatment is closer to "new visual concept" than "fix," and risks crossing the mission's "no redesign" line.

## RESOLVED — re-verified this phase, not merely assumed

### R1. Color/token governance in the 3D layer — RESOLVED (`804462e`)

Previously flagged (in an earlier DESIGN-PERFECTION-001 pass) as a High-severity token-governance violation: `workspace3d.css`/`flagshipScreen.css` used a bespoke, self-derived visual language (a second brand blue `#4f8cff`, a bespoke radius/spacing/blur scale, an independently re-derived motion-easing curve byte-for-byte identical to the real Nova token) instead of the shared `--nova-*` scale. **Re-verified this phase via direct read of both files**: both now reference real tokens throughout (`var(--nova-radius-lg)`, `var(--nova-space-2)`, `var(--nova-font-size-sm)`, `var(--nova-motion-duration-standard)`, `var(--nova-blur-glass)` on the main glass panel). A small number of deliberately-undisclosed-as-fixed exceptions remain (a handful of below-token-floor micro-copy font sizes, a semantically-different `50%` circle radius, smaller non-glass blur values with no matching token) — all explicitly disclosed and reasoned in `804462e`'s own `DESIGN_AUDIT.md`, re-confirmed here as legitimate, not oversights.

### R2. Phone-landscape navigation regression — RESOLVED (`e336923`)

Previously the single longest-standing layout defect in this engagement's history (first found in `Sprint 36`, reconfirmed unfixed across 6+ subsequent sessions through `MOBILE-EXPERIENCE-001`). **Re-verified live this phase** at 844×390: the real 5-item bottom navigation (Home/Feed/Portfolio/For you/Profile) now renders correctly, replacing the old full-height desktop sidebar. Confirmed via a fresh page load (not a stale/cached state).

### R3. Feedback-widget / bottom-nav overlap — RESOLVED (`e336923`)

Previously confirmed (via `MOBILE-EXPERIENCE-001`'s precise pixel-rect measurement) to physically overlap the "For you" and "Profile" bottom-nav tap targets at 390px width. **Re-verified live this phase** at both 390×844 and 844×390: the Feedback pill now renders clearly above the bottom-nav strip in both orientations (confirmed via screenshot), using the same shared `--mobile-nav-height` variable as the nav itself.

## REASSESSED — not a defect

### N1. Portfolio Health / Fear & Greed orbital node colors

**Previously flagged** (an earlier DESIGN-PERFECTION-001 pass) as a Critical "color-semantics violation," on the theory that these two Flagship orbital nodes should be data-driven (like `worldState.js`'s tone) rather than fixed. **Re-examined this phase**: `panelConfig.js`'s `color` field is used exactly once, in `FlagshipEarthScene.jsx`, to set each of the **10** orbital panels' fixed identity/category color (AI Market Summary = blue, Global Events = orange, Portfolio Health = green, AI Recommendations = purple, Watchlist = yellow, Fear & Greed = red, Agent Consensus = cyan, Macro Calendar = lavender, Breaking News = pink, Alerts = amber) — functioning as a color-coded legend distinguishing 10 simultaneously-visible orbital nodes, confirmed live via screenshot. This is a different, legitimate design concept from a data-bound sentiment indicator (which `worldState.js` already correctly provides elsewhere, e.g. the Earth's own tone/glow). Conflating "this node's fixed identity color" with "this node's real-time data value's color" was the error in the original finding, not the implementation. No change recommended.

## Categories inspected this phase with no new finding

**Glass/blur, shadow, motion, hover/focus states (Nova-era screens)**: spot-checked live on Flagship, Mission Control, and Portfolio Workspace at 1440×960 — glass panels render with correct layered depth (translucent surface, soft shadow, subtle border), hover/focus states are present and instant-feeling, motion is purposeful and non-janky. No new defect found.

**Inline-style magic numbers (Nova components)**: grepped `frontend/src/components/nova/**/*.jsx` and `frontend/src/screens/*Workspace*.jsx` for hardcoded pixel values outside the token scale — found none beyond small, reasonable fixed icon-glyph dimensions (e.g. a 6px status dot), which are not part of the spacing scale's domain. `frontend/src/styles/components.css` itself has zero hardcoded hex/blur/easing values — fully token-driven.

**Icon-sizing consistency (repo-wide)**: not exhaustively re-verified this phase either (same disclosed scope limit as the prior pass) — flagged again as a recommended, not yet completed, verification pass, not a confirmed defect.
