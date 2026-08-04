# PIXEL_PERFECT_REPORT.md — Phase PIXEL-PERFECT-001

**Mission:** final visual inspection before Release Candidate — polish execution only, no redesign, no new UI. HEAD at session start: `6c863d6` (no new commits since the prior phase).

**Method:** live browser testing with fresh servers, real viewport sweeps across the full desktop/tablet/phone range (not spot checks at 2-3 fixed sizes), plus targeted `grep`-based CSS audits reusing the exact technique that found real defects in the three prior visual-polish phases (`DESIGN-PERFECTION-001`/`CINEMATIC-POLISH-003`/`WORLD-CLASS-FINISH-001`) — specifically, searching for the same defect *classes* those phases already proved recur in this codebase (a shared concept implemented consistently in the newer NOVA system but inconsistently in the older, still-widely-used legacy `styles.css`), rather than re-litigating anything those phases already fixed and re-verified as still present.

## Scope decision, stated up front

Given the breadth of the Verify list (32 items × 12 named screens), this phase prioritized **cross-cutting, shared-chrome defects that affect every screen at once** over per-screen pixel-nitpicking — a bug in `.main-panel`/`.header-controls`/`.bottom-nav` (used by all 12 named screens) is a higher-value find than a one-off spacing inconsistency on a single screen, and this phase's real, new findings below are all exactly that shape. Contrast, motion (`prefers-reduced-motion`), focus rings, and touch targets were **not re-audited from scratch** this phase — they were the direct subject of the three immediately preceding visual-polish phases and were spot-re-confirmed still correct (not reverted) rather than fully re-derived.

## New defects found and fixed this phase

### 1. Tablet-portrait width has NO primary navigation at all (Critical — functional, not just cosmetic)

**Confirmed live at 768px width** (a real, extremely common tablet-portrait resolution — iPad, most Android tablets in portrait): `.sidebar` computed `display: none` (correct — it's hidden below 900px) **and** the mobile bottom nav also computed `display: none` (its own visibility rule only triggers below 720px). Every width from 721-900px — a real band covering 768px (iPad), 810/820/834px (iPad Air/Pro portrait) — had **zero navigation visible**, confirmed via direct DOM/computed-style inspection, not inferred.

Root cause: an older, separate `@media (max-width: 900px) { .sidebar { display: none; } ... }` rule (pre-dating the later `MOBILE-FIXES-001`/`APP-STORE-QUALITY-001` bottom-nav work) hides the sidebar at a wider threshold than the bottom nav's own 720px activation point, and the two were never reconciled.

**Fix:** extended the same, already-correct bottom-nav markup/styling into the 900px block (not a new navigation concept — the identical `BottomNav.jsx` output, just made visible at the width where it's actually needed). Verified live across the full 768-900px range: sidebar correctly hidden, bottom nav correctly visible and positioned, zero horizontal overflow, `.main-panel` given the matching bottom padding so content doesn't sit under the now-fixed nav.

### 2. Narrow-desktop / tablet-landscape header overflow at 981-1149px (High)

**Confirmed live at 1024×768** (the classic iPad-landscape resolution): a real, measured **~88px horizontal overflow** (`scrollWidth` 1112 vs `innerWidth` 1024). Root cause, traced precisely: above the existing 980px breakpoint (which already stacks `.header-controls` into a column when narrow), the header returns to an unstacked row — but the row's real content (a `330px`-min-width search box + market-status pill + 4 icon buttons) doesn't actually fit next to the sidebar until roughly 1150px, leaving a genuine, un-covered gap between the two already-existing breakpoints.

**Fix:** added a narrowly-scoped `@media (min-width: 981px) and (max-width: 1149px)` block reusing the *exact same* stacked-column treatment the 980px breakpoint already applies — not a new layout pattern, just extending an existing, already-correct one to cover the gap between it and where the row layout naturally fits again. Verified live: zero horizontal overflow at every width from 900px to 1440px, confirmed via a full sweep (900/950/1000/1024/1080/1100/1149/1150/1200/1440), not just the two endpoints.

### 3. `.main-panel` missing `min-width: 0` (Medium, contributing cause of #2)

A real, textbook flexbox defect: `.main-panel { flex: 1; ... }` had no `min-width: 0`, so its default `min-width: auto` let its own content (the header) force it wider than its allotted space — a real, independently-confirmed ~8px slice of the overflow in #2, and a defect that could resurface on any future content addition to the header even after #2's fix. Added the standard, one-line fix.

### 4. Missing hover-transition timing on 5 legacy selectors (Medium — motion/transitions)

The exact same defect *class* `CINEMATIC-POLISH-003` found and fixed in the NOVA component system (`components.css`) — a hover-triggered property change with no `transition` declared on the base rule, so the change snaps instantly instead of animating — was never checked against the older, still-extremely-widely-used `styles.css`. Confirmed via `grep` for every `:hover` rule in that file and cross-checked each one's base rule for a covering `transition`:

| Selector | Property that snapped | Used on (confirmed via `grep`) |
|---|---|---|
| `.ghost-button` / `.primary-action` | `box-shadow` (the `transform` half already had a transition; `box-shadow` didn't) | Nearly every named screen in this mission — Home, Recommendations, AI Analysis, Portfolio, Decision Center, Themes, Watchlist, and more |
| `.header-suggestion` | `color`, `border-color` | Header search autocomplete, all screens |
| `.analysis-sticky-nav__link` | `color`, `border-color` | AI Analysis's own section nav |
| `.header-menu__item` | `background` | Account/quick-actions dropdown menus |
| `.onboarding-back-button` | `color` | Onboarding flow |

**Fix:** added the missing `transition` declarations (matching the existing `0.2s ease` convention already used by every correctly-animated sibling rule in this same file) to all 5 selectors.

## Confirmed still correct, not re-touched (spot-checked, not re-derived)

- NOVA component hover/focus transitions (`CINEMATIC-POLISH-003`/`WORLD-CLASS-FINISH-001`'s fixes) — re-confirmed present via source read, not reverted.
- Safe-area insets, header-icon hit-slop, feedback-widget positioning, manifest orientation lock removal (`APP-STORE-QUALITY-001`) — re-confirmed present.
- Design-token contrast ratios (`X12B` era) — not re-derived from scratch this phase; no token values were changed.

## Regression gate

- `npx vitest run`: **621/621 passing** (77 files) — identical to the pre-fix baseline, zero regressions from any of the 4 fixes above.
- `npm run build`: clean, only the pre-existing, unrelated `INEFFECTIVE_DYNAMIC_IMPORT` and chunk-size warnings — identical to the pre-fix baseline build.

See `FINAL_VISUAL_AUDIT.md` for the full per-verify-item checklist, `RC1_UI_SIGNOFF.md` for the release-candidate sign-off, and `LAST_VISUAL_FIXES.md` for the precise before/after diff of every fix above.
