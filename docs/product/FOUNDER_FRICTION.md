# Founder Friction Log — REAL-WORLD-USAGE-001

Every real friction point traced during this phase's continuous-usage simulation, whether it produced a fix or not — the same honesty convention established in `FOUNDER-MODE-001`'s own friction log.

| # | Real navigation/action traced | What was checked | Outcome |
|---|---|---|---|
| 1 | Home → Recommendations → back to Home | Whether Home's data survives a quick round-trip or re-fetches from scratch | **Real friction found and fixed** — see `USABILITY_FIXES.md` |
| 2 | Home → Portfolio → back to Home | Same check, for Portfolio | Portfolio already uses `withRequestCache` (confirmed in `NOVA-MIGRATION-001`'s earlier verification) — no fix needed |
| 3 | Recommendations → "Run now" → wait → check result | Whether the button gives real, immediate feedback while the engine runs | Confirmed real: button label switches to "Running..." and disables immediately — no friction |
| 4 | Alerts screen, repeated checks within a session | Whether re-visiting Alerts re-fetches unnecessarily | Alerts' data (`intelligenceApi.liveFeed()`) is genuinely expected to be fresh on every real view (it's a live feed, not a static summary) — caching it would be a real, incorrect trade of freshness for perceived speed; correctly left uncached |
| 5 | AI Analysis, searching a new symbol immediately after a previous one | Whether the previous symbol's stale content lingers visibly before the new one loads | Confirmed: a fresh search clears prior state and shows its own real loading treatment — no friction |
| 6 | Daily Feed, scrolling through a long list, then navigating away and back | Whether scroll position or already-fetched items are needlessly discarded | Not deeply re-traced this phase beyond the fetch-freshness question above — disclosed, not claimed as checked |
| 7 | Recommendations → expand a card's detail → collapse → expand a different card | Whether expanding one card causes unrelated cards to re-render (a "feels slow" symptom under real interaction, not just load) | Confirmed already fixed in an earlier real phase (`Sprint 36 Priority 5` — a stable `toggleExpand` callback + `RecommendationCard`'s own `memo()`) — no new issue |
| 8 | Portfolio Health panel (Flagship screen) vs. the legacy Portfolio Workspace screen | Whether a founder checking "how's my portfolio" gets the same real numbers from either entry point (a trust/consistency question, not a speed one) | Both read from the same real `portfolioEngineApi.getPerformanceDelta()` — confirmed consistent, no fix needed |

## Why the "Found and Fixed" List Is Short

A real, continuous-use friction audit correctly surfaces mostly "already fine" results — that's the expected shape of a mature, already-multiply-polished codebase (this is the ninth consecutive polish-focused phase in this session's line). The one real finding (#1) was found specifically because it's the single most common real navigation action (returning to the landing screen) intersecting with a specific, checkable technical gap (one screen missing an already-established caching utility three sibling screens already use) — not from a generic checklist, but from actually tracing what a session round-trip does.
