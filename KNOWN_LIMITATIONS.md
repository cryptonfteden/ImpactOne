# Known Limitations — Private Beta

Honest, as of Sprint 34. Nothing here is hidden or rounded up to "fine."

## Product content quality (not locally verifiable this sprint)

- **Feed/recommendation content uniqueness across a full real session** (checklist items A3–A5, A7, A8 in their broadest form) was spot-checked against live data this sprint (0 duplicate sentences across 28 feed items, 11 distinct sector/asset sets, all 3 active recommendations carry both confidence and a separately-valued uncertainty score, all 3 carry explicit invalidation conditions) but was not exhaustively re-verified across a full simulated beta session with a genuinely empty account.
- **Recommendation supersession history was investigated, not just measured.** AAPL, NVDA, and TSLA each show 40–100 consecutive identical-action entries. This was traced to the engine re-evaluating every ~15 minutes and confirmed genuinely re-evaluating (confidence score varies across the run — 8 distinct values across 100 AAPL entries over 3 days) rather than frozen. Logged as confirmed-genuine, not a bug. If a symbol's action ever goes stale for a materially longer period without a single confidence tick, that would be worth re-investigating.

## Architecture

- **Two independent portfolio systems exist in this codebase**: a server-owned Portfolio Engine (`portfolioEngineService`, behind `VITE_PORTFOLIO_ENGINE=api`) and a separate client-side "virtual portfolio" (the default `PortfolioScreen`, driven by `useVirtualPortfolio` + localStorage). Home's Portfolio card reads from the server-owned engine. Both currently read the same $100,000 baseline because neither has any trade history yet in this environment, so no live numeric discrepancy has been observed — but they are not the same system, and if either accumulates trades independently of the other, their numbers could diverge. Not unified this sprint (architecture change, out of scope for a hardening sprint); worth resolving before a wider rollout.
- **No URL routing.** The app has always used pure client-side view-switching (`activeView` state), not a router. There is no deep-linking, no shareable per-screen URL, and reloading always returns to Home. This is a pre-existing architectural characteristic, not a regression, but it means "deep links" as a mobile-audit category doesn't apply in the traditional sense — confirmed rather than assumed.

## Offline/resilience coverage

- Home has the most complete offline/stale-data handling (preserves last-known data, labels its age, distinguishes "nothing changed" from "couldn't check"). Portfolio, Daily Feed, and Recommendations now also preserve already-loaded data on a refresh failure (Sprint 34), but only Home shows a real freshness timestamp — the other three don't yet.
- The offline app shell (service worker) caches the app's own code and static assets, never API/financial data. A user reopening the app offline sees the real interface with an honest "you're offline" banner, not stale numbers presented as current.

## Private beta gate

- Section A (Product Readiness) of `PRIVATE_BETA_GO_LIVE_CHECKLIST.md`: **12/12 items now measured and passing** as of Sprint 34 (was 7/12 at the end of Sprint 33). See `SPRINT_34_REPORT.md` for the evidence behind each.
- Sections B (Program Operational Readiness), C (Feedback & Monitoring Systems), D (Legal/Privacy/Safety) remain **not applicable to local engineering work** — they require 25 named real candidates, named monitoring owners, and legal/consent processes that no code change can satisfy. These are organizational, not technical, blockers.
