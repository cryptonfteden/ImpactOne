# Mission Control Home — Review

**Phase:** X12C.1 · **Mode:** BUILD → REVIEW · **Reviewer role:** Sonnet, judging implementation quality only.
**Scope discipline:** no new features requested or suggested; no NOVA redesign proposed. Every finding below is against the screen exactly as it exists in `frontend/src/screens/MissionControlHomeScreen.jsx` today.

## Method

Read the screen source, its feature wrapper (`MissionControlHomeFeature.jsx`), its nav wiring (`Sidebar.jsx`, `screenRegistry.js`), the NOVA components it claims to reuse (`Card`, `Badge`, `AiConfidence`, `AiRecommendation`, `Table`, `EmptyState`, `Skeleton`, `Grid`, `Stack`, `Page`, `Container`), and `X12C1_COMPLETION_REPORT.md`. The completion report explicitly discloses it was **"not manually verified in a running browser"** — so this review does not take its claims on faith. Started both servers fresh, opened the real app, navigated Sidebar → **More tools → Mission Control**, and live-tested at 1440×1024 (desktop), 900×1000 (tablet-adjacent), 390×844 (mobile), plus a forced `dir="rtl"` pass, using DOM/computed-style measurements (`scrollWidth` vs `clientWidth`, `getComputedStyle`) rather than eyeballing alone.

---

## 1. Does this feel like an AI Operating System rather than another finance dashboard?

**Partially.** The macro composition is right: one page, six named command-surface sections (At a Glance, Priority Intelligence, Top Recommendation, Portfolio Risk, Belief Changes, Active Alerts), each backed by the same real live data as Home, with `AiRecommendation`'s violet-bordered card and `ConfidenceBadge`'s "Low/Moderate/High/Very High · N/100" vocabulary doing real work to make this read as AI-native rather than a generic KPI dashboard. The `AiRecommendation` card for NVDA REDUCE, paired with a real per-symbol quality-score list, is the strongest single moment on the screen and does feel like a console reading out a live decision.

It stops short of "Operating System" for two concrete reasons found live, not hypothetical:

- **"Portfolio Risk" shows a number that isn't a risk number.** The card is titled "Portfolio Risk" and renders `AiConfidence` bound to `portfolioMorningSummary.biggestOpportunity.qualityScore`, which on this real account was `0` (there's no standout opportunity today) — so the card reads **"Portfolio Risk — Low · 0/100"**, live-confirmed via screenshot. That sentence is a false-sounding statement: 0/100 is being displayed as if it graded portfolio risk, when it's actually an absent-opportunity fallback with no relation to risk. The completion report itself calls this "an honest proxy, not a fabricated metric, but worth revisiting" — the review agrees with the self-assessment: proxy metrics that borrow a real-looking meter for a different meaning are exactly the "confidence theater" pattern this codebase's own audit history (World Memory / TRUTH.md epistemology) has repeatedly flagged elsewhere. An OS-grade command surface should never show a labeled score whose number and label don't refer to the same thing.
- **Every one of the screen's five buttons ("Open Recommendations," "Open Portfolio," "Open Decision Center," etc.) is the legacy pre-NOVA `.ghost-button` CSS class**, not the certified NOVA `Button` component that exists in the same `frontend/src/components/nova/` folder this screen otherwise draws from correctly. Since buttons are the one interactive primitive on the whole page, the entire "command center, act on this" affordance is currently running on the old visual language, not NOVA's.

## 2. Information hierarchy — what does the eye see first? Is the screen calm or overloaded?

The eye correctly lands on the `h1` ("Everything that needs you, in one view") then the four KPI tiles, which is the right order. Density is reasonable — six sections, no infinite scroll of unrelated widgets, consistent with a calm reading of the mission's "command center not a widget collection" bar.

One concrete calm-breaking defect, confirmed live in the accessibility tree at every viewport: **each KPI tile repeats its own label twice.** The "Active Alerts" tile renders the eyebrow header **"Active alerts,"** a value, and then a `Badge` that again says **"Active alerts"** — the same three words appear twice in a card whose only other content is the number `0`. This happens on all four KPI tiles (Action needed / Portfolio changes / Beliefs updated / Active alerts) and is the single most avoidable piece of visual noise on the page — it doesn't add information, it just repeats the header the eye already read a half-second earlier.

## 3. Component usage — were certified NOVA components reused correctly? Duplicated UI? Inconsistent spacing?

**Mixed.** The screen is genuinely, verifiably built from the NOVA library for its cards, badges, AI components, table, empty states, and layout primitives — no bespoke reimplementations of those were found, and the `gridColumn: "span N"` inline-style convention for placing children inside `Grid` matches the exact precedent already set by the NOVA Showcase's own `AiComponentsSection.jsx`/`CardsSection.jsx`, so that specific pattern is not a new inconsistency, it's the established one.

Two real component-reuse gaps found:

- **All interactive actions bypass the NOVA `Button` component** in favor of the legacy `.ghost-button` class (see §1) — this is the clearest "certified component not reused" finding on the screen.
- **List content (`Priority Intelligence`, `Top Recommendation`'s secondary list, `Belief Changes` when populated) reuses the pre-NOVA `.stack-list`/`.company-description` classes from `styles.css` rather than a NOVA text/list primitive** — visually adequate in the common case, but it means text color/spacing on this "NOVA screen" is partly still running on the old, un-tokenized hex-color styles (`color: #cbd5e1`, `color: #94a3b8`) rather than `--nova-color-text-*` tokens, which is a real, checkable seam between two design systems on one screen.

No duplicated components were found (nothing reimplements what an existing NOVA component already does). Spacing between NOVA-primitive sections (`Stack`/`Grid` with token-based gaps) is consistent; spacing *inside* the legacy-class content areas is not on the same token system, which is the inconsistency, not raw pixel drift.

## 4. Mission Control experience — command center or a collection of widgets?

Leans command center, not widget collection: every section ties back to the same live account state (NVDA REDUCE appears consistently in Priority Intelligence, Top Recommendation, and would appear in Belief Changes/Alerts if either had content), and three of the six sections have working, correctly-wired "jump to the real screen" actions (Recommendations, Portfolio, Decision Center) — a real cross-linked console, not six independent cards. What holds it back from feeling fully unified is exactly the §1/§3 findings: a mislabeled score and a button style seam are small things individually, but a command center's whole promise is "one coherent system," and both are visible the moment a user actually looks closely.

## 5. Responsive behavior

Live-tested, not assumed:

| Viewport | Result |
|---|---|
| Desktop 1440×1024 | Clean 12-column grid, KPI tiles 4-across (`span 3`), two-up sections `span 6` as designed. No overflow. |
| Tablet-adjacent 900×1000 | Correctly falls into the 8-column band (`layout.css` breakpoint), KPI tiles render 2-across. `document.documentElement.scrollWidth === clientWidth` (885 = 885) — **zero horizontal overflow**, confirmed by direct measurement, not a visual guess. |
| Mobile 390×844 | 4-column band, every KPI tile and section renders full-width and stacks cleanly. `scrollWidth === clientWidth` (375 = 375) — **zero horizontal overflow** here too. |

Mission Control's own layout has no responsive defect at any of the three tested widths — a clean result. The one real degradation visible on mobile is **not caused by this screen**: the shared `Header` (search bar, market pill, alert/notification/quick-action/account icons) still stacks vertically and consumes a large, persistently sticky share of the viewport before any Mission Control content is reachable — a pre-existing, previously-documented Header issue (not introduced by this phase), but it does materially affect how "calm" Mission Control feels on a real phone since roughly a third of the screen is gone before the command surface even starts.

## 6. Accessibility

Real, verified via the live accessibility tree (not just code-reading):

- Every section is a genuine ARIA `region` with a distinct accessible name (`region "Priority Intelligence"`, `region "Portfolio Risk"`, etc.) — confirmed directly in the snapshot, matches the completion report's claim.
- Loading state's `aria-busy="true"` + descriptive `aria-label` is present in source and consistent with the app's existing boot-screen pattern.
- The Active Alerts table renders a real `<table>`/`<th>`/`<td>` — native semantics, not a styled `<div>` grid.
- `Skeleton` is `aria-hidden="true"`, correctly treated as decorative.

No contrast or focus-order defects were found in this pass. This is the strongest-scoring dimension of the review.

## 7. RTL/LTR readiness

**Mixed — genuinely good at the macro level, with one real, measured defect at the micro level.**

Forcing `dir="rtl"` live produced a correctly mirrored page: the sidebar moved to the right edge, the KPI tile reading order reversed, the two-column "Top Recommendation / Priority Intelligence" pair swapped sides, and all text right-aligned — confirmed by screenshot. This validates the completion report's claim that NOVA's `Stack`/`Grid`/`Container` logical-property foundation makes the screen RTL-ready without code changes.

The defect is in the **reused legacy content**, not the NOVA layer: `getComputedStyle()` on a live `.stack-list` element under `dir="rtl"` returned `padding-left: 18px` **and** `padding-inline-start` resolving to `40px` simultaneously — i.e. the author rule's physical `padding-left: 18px` (from `styles.css`) never flips sides in RTL, leaving a dead, meaningless 18px gap on the visual left, while the actual right-side list indent in RTL comes only from the browser's unstyled UA-default `padding-inline-start: 40px` on `<ul>`, not from an intentional design decision. This is a small, real, numerically-confirmed asymmetry inherited from the legacy `.stack-list` class this screen reuses for Priority Intelligence's bullet list and any other populated list section — it would not have been caught without forcing RTL and reading computed styles directly.

## 8. Visual polish

- `mission-control-screen`, `mission-control__grid`, and `mission-control__kpi-card` — the three CSS class hooks this screen defines for itself — **are not defined anywhere in any stylesheet** (confirmed via repo-wide search). They're harmless no-ops today, but they're dead code that suggests intended-but-unfinished screen-specific polish (e.g., no dedicated hover/emphasis treatment for the KPI cards beyond what generic `Card` already provides).
- The AI-native surfaces (`AiRecommendation`, `ConfidenceBadge`, the confidence bar) are visually the most polished part of the screen and look distinctly "AI product," not generic dashboard chrome.
- The KPI-label duplication (§2) and the mixed button styling (§1/§3) are the two things keeping this from reading as fully finished at a glance.

---

## Summary of concrete, code/DOM-verified findings

1. KPI tiles repeat their own label twice (eyebrow + Badge) on all 4 tiles — live-confirmed.
2. "Portfolio Risk" displays an unrelated opportunity-quality fallback (0/100) under a risk label — live-confirmed, self-disclosed as a known limitation by the implementer.
3. All 5 buttons use the legacy `.ghost-button` class, not the certified NOVA `Button` component that exists for this exact purpose.
4. Populated list sections use legacy `.stack-list`/`.company-description` classes (un-tokenized hex colors), not a NOVA text/list primitive.
5. `.stack-list`'s physical `padding-left: 18px` does not mirror in RTL — measured live via `getComputedStyle` under a forced `dir="rtl"` pass.
6. Three screen-specific CSS classes (`mission-control-screen`, `mission-control__grid`, `mission-control__kpi-card`) are unused/undefined dead hooks.

## What is genuinely strong and should be preserved

- Real NOVA composition for cards/badges/AI components/table/empty-states/layout primitives — no reinvented components, no new anti-patterns.
- Zero horizontal overflow at any of the three tested viewports, measured not assumed.
- Real macro-level RTL mirroring, verified live.
- Real ARIA region landmarks with localized names, verified in the live accessibility tree.
- Additive, non-destructive nav wiring (Home and the 5-item bottom nav are untouched; this is reached only via Sidebar's "More tools").
