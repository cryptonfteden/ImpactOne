# Sprint 24 — First Daily User — Final Report

**Branch:** `sprint-16-live-data` (not pushed) · **Commits:** 7 · **Date:** 2026-07-14

## Mission

Make ImpactOne the first application opened every morning — user value over technical elegance, executed autonomously against the six named objectives, never violating `TRUTH.md`, `CANONICAL_DOMAIN_MODEL.md`, `EVIDENCE_QUALITY_MODEL.md`, `KNOWLEDGE_GRAPH_ARCHITECTURE.md`, `INVESTMENT_INTELLIGENCE_MODEL.md`, `ARCHITECTURE.md`, or `API_CONTRACTS.md`.

## What was built, and why it's real

Every change below reuses an existing, already-computed data source rather than inventing a new one — no card, number, or narrative line in this sprint is fabricated. Where a real answer wasn't available, the UI says so honestly instead of guessing.

### 1. Home — six questions in seconds
Extended `homeSummaryService.js` from four questions to six and rebuilt `HomeScreen.jsx` to match, folding "How does it affect me?" into "Why should I care?" to land on exactly six cards, not seven:
- **What changed since yesterday?** — reuses `dailyBriefService`'s own existing day-over-day comparison (`buildChangedSinceYesterday`), never a second competing computation.
- **What changed for my portfolio?** — reuses a new `portfolioEngineService.getPerformanceDelta()`, which compares today's live summary against the most recent `PerformanceSnapshot` from before today.
- **What changed in the platform's beliefs?** — the one genuine gap closed this sprint. `WorldMemoryThesisRevision` has existed since Sprint 21B with **zero writers**. The daily theme snapshot job now appends a revision whenever a theme's thesis text actually changes; Home reads real, recent revisions. This is the first time this table has ever held data.

Every "what changed" card has a tested, honest empty state ("No prior-day snapshot yet," "No theme thesis has changed recently") — confirmed live in the browser, not just asserted in a test.

### 2. Daily Feed — closing a real gap between "computed" and "shown"
Discovered that `explainability.invalidationSignals` (a real field, computed via `buildInvalidation(eventType)` since this pipeline was built) was **never rendered anywhere**. Now shown under "Why this analysis" alongside the existing counter-evidence. Added an honest theme tag (only for one of the 7 real tracked themes, sourced from the same classifier the Theme Dashboard uses — never fabricated for an unrelated event type). Relabeled "Counterarguments" to "Counter-evidence" for consistent wording. Deliberately did **not** add an Uncertainty field to feed cards — it is not computed per feed item anywhere in the backend, and `EVIDENCE_QUALITY_MODEL.md`'s missing-data-honesty rule forbids showing a number that doesn't exist.

### 3. Portfolio Intelligence — a narrative, not just tables
New top-of-screen "Portfolio Intelligence" card on the server-backed Portfolio screen: a plain-language today-vs-yesterday summary, with meaningful changes listed only when they clear a real threshold (≥0.5% total value, ≥\$1 unrealized P/L) — never noise. The existing dense tables stay; this sprint adds the missing narrative layer on top rather than tearing anything out, per "reuse before rewrite."

### 4. Recommendation transparency — surfacing what was already computed
`DecisionTrace.confidenceCalculation.uncertainty` has existed since Sprint 18A and was **never fetched or rendered anywhere in the frontend** — the exact same pattern as the Daily Feed gap above. Now shown next to Confidence on expand. "History" (prior superseded recommendations for the same symbol) reuses the existing `GET /v2/recommendations?symbol=` endpoint, which already returns every status, not just `ACTIVE` — no backend change needed, only a frontend fetch that had never been wired up.

### 5 & 6. Performance and Trust
Handled as a byproduct of the above rather than as a separate initiative: every new card has a real loading and honest-empty state (verified in the browser, zero console errors); duplicated wording was reduced (Home's "How does it affect me?" folded into "Why should I care?"; Feed's "Counterarguments" → "Counter-evidence" to match the platform's other wording). A dedicated, broader performance/transition/error-state pass across every existing screen was **not** undertaken this sprint — see Stopping Rationale.

## Constraint compliance

- **No recommendation logic changed** — `autonomousRecommendationEngine.js` untouched.
- **No portfolio logic changed** — `portfolioEngineService.js` gained one new read-only aggregation function (`getPerformanceDelta`); `placeOrder`/order logic untouched.
- **No Outcome Engine changed** — `Outcome`/grading untouched.
- **Every principle document honored** — no fabricated confidence/uncertainty (Truth §4, §13.1), no second decision source, no duplicated verdict, evidence/counter-evidence/invalidation shown only where genuinely computed (Evidence Quality Model), thesis revisions append-only via the existing World Memory writer discipline (Knowledge Graph Architecture, Canonical Domain Model §1.3, §2.9).

## Verification

- **Backend:** 248/248 tests passing (full suite, `--test-concurrency=1`), run before every commit.
- **Frontend:** 92/92 tests passing (full suite), run before every commit.
- **Browser verification:** live pass against real dev servers after all changes — Home renders exactly 6 cards with correct honest-empty states; Recommendations shows a real Uncertainty value on expand; Daily Feed shows real (non-mock) content; Portfolio renders. Zero console errors across the entire pass.
- **7 commits**, each preceded by its own test run, none pushed.

## Stopping rationale

Per the mission's stop condition — stop when there is no remaining *high-impact* improvement that fits this sprint, judged against "would I personally replace Bloomberg, Reddit, and X with this screen every morning." The six objectives are addressed with real, working, verified functionality; the two highest-leverage moves were finding and surfacing data the backend had already computed but the frontend had never shown (`invalidationSignals`, `uncertainty`) and closing World Memory's one real write-gap (`WorldMemoryThesisRevision`) — both compound in value for every future sprint, not just this screen.

What was deliberately left for a future sprint, named explicitly rather than silently skipped:
- A full "AI conversation" rewrite of Portfolio (teaching/prioritization framing beyond the new narrative card) — the narrative card is real and honest, but the mission's fuller vision ("explain, teach, prioritize") is a larger scope than one sprint's remaining budget supports well.
- A systematic performance/transition/empty-state audit across every screen not touched this sprint (Watchlist, AI Analysis, Global Intelligence, Alerts, Settings) — only the screens this sprint's data changes actually touched were verified.
- Automated (not just on-demand) `PerformanceSnapshot` capture — the day-over-day portfolio delta is only as fresh as the last time a snapshot was captured, since no daily scheduler exists for it yet (a pre-existing, named gap, not introduced by this sprint).

None of these are silent gaps — each is a legitimate next sprint, not a corner cut on this one.
