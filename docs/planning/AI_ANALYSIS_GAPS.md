# AI Analysis Gaps

Every finding below was verified directly against the current source of `AiAnalysisScreen.jsx`. Ranked CRITICAL / HIGH / MEDIUM / LOW. A positive, already-resolved finding is listed first since it materially changes how the rest of this list should be read.

---

## RESOLVED (credited, not a gap)

### R1. The "Wall Street Analyst Consensus" mislabeling — the most persistent trust defect this screen has ever had — is fixed
Confirmed: the card is now titled "Wall Street Analyst Consensus," subtitled "Third-party data — not an ImpactOne recommendation," with a Phase E3.5 code comment confirming the deliberate rename and pointing to where ImpactOne's own recommendation lives. This defect was independently reconfirmed unfixed across at least four prior review sessions (Sprints 36, 37, 39, Phase E2) — it is now resolved.

---

## HIGH

### H1. Seven-plus independent, unranked confidence/score displays on one screen, with no reconciliation
Wall Street Analyst Consensus, the AI Report's `confidenceScore`, Claims-Based Analysis's `confidence`/`probability`, Market Impact Engine's `marketImpactScore`, Alternative Data Signals' embedded `confidenceScore`, Impact Intelligence Engine's `confidenceScore`, and the Committee's per-member Confidence/Uncertainty/Freshness plus a separate CIO confidence — all render with no stated relationship to each other, no shared visual hierarchy, and no explicit note when they might disagree. Each is honestly labeled as to its own source (the old mislabeling problem is fixed), but the volume and lack of reconciliation is itself a real cognitive-load and trust risk.

### H2. No shared confidence-presentation instrument
None of this screen's confidence values use the platform's established `MetricArc`/`AttentionLevelBadge`/`Badge` components — every score is ad-hoc plain text, inconsistently formatted (some `X/100`, some a bare number with no stated scale) and never color-coded, unlike every other reviewed screen in this app.

---

## MEDIUM

### M1. No reading-order or hierarchy guidance across the screen's many sections
Every `SectionCard` on this screen carries equal visual weight in a fixed order — there is no hero, no "start here," no indication of which of the many sections is most decision-relevant. This is consistent with the screen's own stated "explain everything" philosophy (the canonical, action-oriented verdict deliberately lives on the separate Recommendations screen instead), but even within that philosophy, a first-time reader has no way to know which section to prioritize.

### M2. Direction-to-tone mapping duplicated inline instead of reusing the shared helper
`currentBeliefClaim.expectedDirection === "BULLISH" ? "buy" : ... === "BEARISH" ? "sell" : "hold"` is computed directly inline (in at least two places) rather than via the already-shared `directionTone()`/`IntelligenceCard` pattern used by Mission Control, Portfolio Workspace, and News Intelligence.

### M3. No cross-section disagreement is ever surfaced explicitly
If the Wall Street consensus, the AI Report's rating, the Claims-Based direction, and the Committee's member votes point in different directions for the same symbol, nothing on the screen states that they disagree or explains why — each is shown independently, leaving the user to notice and reconcile any contradiction unaided.

---

## LOW (architecture, not user-facing)

### L1. No Design System (`components/nova`) reuse
Confirmed via import inspection — this screen is built entirely on the older `components/ui`/`SectionCard` library.

### L2. No `PlatformContext` reuse
Ticker selection from other screens still arrives via a bespoke `window.addEventListener("impactone:select-ticker", ...)` custom event rather than the shared `PlatformContext`.

### L3. No `requestCache` reuse
Every API call (`altDataApi`, `analysisApi`, `intelligenceApi`, `marketApi`, `performanceMetricsApi`, `claimsApi`) is issued directly with no de-duplication against identical concurrent requests from other screens.
