# AI Analysis Review

**Phase:** AI-ANALYSIS-REVIEW-001
**Scope:** As requested — the AI Analysis Workspace only. No code was changed to produce this review.

## Before anything else: what "AI Analysis Workspace" actually is today

Consistent with the pattern found in the last two reviews (Watchlist, and before it the Design System audits): **`AiAnalysisScreen.jsx` is not built on the platform architecture used by Mission Control, Portfolio Workspace, News Intelligence, or the new Watchlist Workspace.** It imports `SectionCard`/`Button`/`Input`/`LoadingSpinner` from `../components/ui` (the older library), not `components/nova`. There is no `AiAnalysisWorkspaceScreen.jsx` — this is the same, long-standing screen this engagement has reviewed several times before (Sprints 36, 37, 39, and Phase E2), now reviewed again with a narrower, more technical lens per this phase's mission.

**The most important finding of this review, stated up front: a real, verified, historically-significant fix has landed since this screen was last reviewed.** The "Recommendation" card — which this engagement flagged as a trust problem across four separate past sessions, because it silently displayed Finnhub's third-party analyst consensus under a heading that read as ImpactOne's own verdict — is now titled **"Wall Street Analyst Consensus,"** subtitled **"Third-party data — not an ImpactOne recommendation,"** with an explicit code comment (Phase E3.5) confirming the rename was deliberate and pointing to where ImpactOne's own recommendation actually lives. This is a genuine, overdue, and correctly-executed fix to the single most persistent trust defect this screen has ever had, and it should be credited plainly rather than buried.

---

## Reasoning quality

The reasoning content itself, section by section, is substantive and honest. The Claims-Based Analysis section in particular explicitly follows a real, disciplined structure (per its own code comment): Executive Summary → Why this matters → Evidence → Counter evidence → Portfolio impact → Possible outcomes → Confidence → Unknowns → Things to monitor next — every field mapped to a real Claim contract field, with an explicit honesty rule that "Possible outcomes" is disclosed as "not yet available" rather than fabricated (the Scenario Engine doesn't exist yet). The Committee section shows genuine, real per-member reasoning, supporting evidence, and counter-evidence — not just a vote.

The one real reasoning-quality gap: this screen now contains **at least seven independently-sourced sections that each carry their own confidence-like score** — Wall Street Analyst Consensus, the OpenAI-backed AI Report (`confidenceScore`), Claims-Based Analysis (`confidence`/`probability`), Market Impact Engine (`marketImpactScore`), Alternative Data Signals (its own embedded `confidenceScore`), Impact Intelligence Engine (`confidenceScore`), and the Committee (a per-member Confidence/Uncertainty/Freshness table plus a separate CIO confidence). None of these numbers are reconciled, ranked, or given a stated relationship to each other anywhere on the screen.

This is a materially different problem than the old mislabeling — every section here is honestly attributed to its real source — but the sheer volume of parallel, unranked scoring creates its own, subtler trust risk: a user has no way to know which of seven "confidence" numbers should carry the most weight for an actual decision. The screen's own code comment states its philosophy directly: *"AI Analysis answers exactly one question: 'Explain everything.'"* — meaning this is a deliberate deep-dive research screen, with the one canonical, action-oriented verdict living on the separate Recommendations screen. That's a reasonable design intent, and it should be credited — but even within an "explain everything" screen, there is currently no reading-order guidance (no hero, no "start here," no tiered structure) to help a first-time reader understand which of these seven perspectives to weigh most heavily before acting.

## Evidence hierarchy

Within the Claims-Based Analysis section specifically, evidence hierarchy is handled well and honestly: real evidence and real counter-evidence are both shown as explicit, separate, first-class fields (not one buried inside the other), and an honest fallback ("No real supporting evidence recorded yet") appears when either is empty rather than an empty-looking blank.

Across the whole screen, however, there is no hierarchy at all between the seven-plus sections themselves — they render in one fixed order, each with equal visual weight (identical `SectionCard` treatment), with no signal for which is more authoritative, more current, or more relevant to a real decision. A first-time user has to read the entire screen to know that the Wall Street Consensus card at the top is the least authoritative of everything below it, purely from having read this review or the subtitle text carefully — nothing in the page's visual weighting reflects that.

## Contradictory evidence

This is genuinely well handled where it's structurally supported: the Claims-Based Analysis section shows real counter-evidence alongside real evidence, and the Committee section shows real per-member disagreement (each specialist's own reasoning, evidence, and counter-evidence, not just a single blended verdict) — consistent with this platform's "committee debates, never decides" discipline established elsewhere. The CIO summary additionally carries an honest **"Why this may be wrong"** and **"Missing information"** section — a real, disclosed acknowledgment of uncertainty and gaps, not a false-confidence summary.

What's not handled: nothing on this screen reconciles disagreement *between* the seven-plus sections themselves. If the Wall Street consensus, the AI Report's rating, the Claims-Based direction, and the Committee's member votes point in different directions for the same symbol (a real, plausible scenario given they're independently generated), a user sees all of them, unreconciled, with no explicit statement that they disagree or why that might be — the same class of gap this engagement flagged in the Sprint 38/39 committee-vs-headline-verdict findings, now potentially spread across even more sections than before.

## Confidence presentation

Mixed. Where the platform's shared `MetricArc`/`AttentionLevelBadge` conventions exist elsewhere (Mission Control, Portfolio Workspace, News Intelligence), this screen uses none of them — every confidence value here is rendered as plain text (`Confidence {score}/100`, `Confidence: {score}`), with no shared visual instrument, no consistent formatting (some sections show `X/100`, the CIO summary shows a bare number with no explicit scale stated), and no color-coding at all. This is a real, direct inconsistency with the rest of the platform's now-established confidence-presentation standard, and it means the same underlying concept ("how sure is this") looks and reads differently in nearly every section of this one screen, let alone against the rest of the app.

## User trust

Net positive change since the last review, driven almost entirely by the Wall Street Analyst Consensus rename. That fix directly resolves the most severe, longest-standing trust defect this screen has carried. What remains as a trust concern is subtler: the volume and lack of reconciliation across seven-plus independently-labeled scores (see Reasoning quality/Contradictory evidence above) risks a different kind of trust erosion — not "this claims to be something it isn't" (fixed), but "there are too many numbers here for me to know which one to believe," which is its own, real failure mode for a screen whose job is to help someone make a decision.

## Design System reuse

**None.** Confirmed via direct import inspection: no `components/nova` import anywhere in `AiAnalysisScreen.jsx`. Every card is the older `SectionCard`; every score display is ad-hoc, hand-styled text rather than `MetricArc`/`AttentionLevelBadge`/`Badge`.

## PlatformContext reuse

**None.** No `usePlatformContext` import. A claim or symbol selected on Mission Control/Portfolio Workspace/News Intelligence does not carry into this screen, and vice versa — this screen still relies on its own separate mechanism (a `window.addEventListener("impactone:select-ticker", ...)` custom event) to receive a ticker selection from elsewhere in the app, rather than reading it from the shared `PlatformContext`.

## requestCache reuse

**None.** Every API call (`altDataApi`, `analysisApi`, `intelligenceApi`, `marketApi`, `performanceMetricsApi`, `claimsApi`) is issued directly, with no `withRequestCache` wrapping — no de-duplication with any other screen's concurrent identical requests (e.g., this screen's own `claimsApi` call for the current ticker's Claim is a separate, unshared request from any other screen that might be fetching the same Claim at the same time).

## Business logic duplication

One clear instance: this screen computes its own direction-to-CSS-class mapping inline in at least two places (`currentBeliefClaim.expectedDirection === "BULLISH" ? "buy" : ... === "BEARISH" ? "sell" : "hold"`), rather than using the shared `directionTone()` helper (or the `IntelligenceCard` component, which already wraps this exact pattern) already established and reused by Mission Control, Portfolio Workspace, and News Intelligence. This produces a real, if currently benign, drift risk: this screen's direction-to-color/label logic is not the one already consolidated elsewhere, and would need a fourth, manual update if that mapping ever changes.

---

See [AI_ANALYSIS_GAPS.md](../../planning/AI_ANALYSIS_GAPS.md) for every finding above, ranked.
