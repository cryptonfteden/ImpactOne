# Unsupported Value Register — LIVE-DATA-FINAL-001

Every visible value found this session that was, or could have been, presented without genuine support — with disposition (fixed / disclosed-only / dead-code).

| # | Value / Location | Issue | Disposition |
|---|---|---|---|
| 1 | `historicalSimilarityService.js` — "88% historical similarity to 'Rate Hikes'" shown for "Shipping rates surge" (Home, Daily Feed, Market Intelligence) | False keyword match: `"rate"` substring found inside `"rates"` (freight pricing), not a genuine topical connection | **Fixed** — word-boundary matching added; now honestly returns no match |
| 2 | `propagationEngineService.js` — "propagating from Fed funds to Bonds (down)" shown for "Shipping rates surge" (Alerts, Home) | Same root cause as #1, same file family | **Fixed** — same word-boundary fix |
| 3 | `historicalSimilarityService.js` — "88% historical similarity to 'AI Boom'" shown for "Semiconductor capacity constraint" (any screen surfacing this event) | False keyword match: `"ai"` substring found inside `"constraint"` | **Fixed** — word-boundary matching added |
| 4 | `propagationEngineService.js` — "propagating from AI demand to Semiconductors (up)" shown for "Semiconductor capacity constraint" | Same root cause as #3 | **Fixed** — same word-boundary fix |
| 5 | `DashboardHome.jsx` line 211 — `overallAiScore: ranking?.overallAiScore ?? row.aiScore ?? 0` | A missing AI score would render as a literal `0`, indistinguishable from a genuinely low real score | **Disclosed only, not fixed** — file confirmed unreachable from the current `Sidebar.jsx` navigation (pre-Sprint-40 legacy, kept only so its own tests still pass); fixing dead code was judged out of scope for an isolated/safe live-data fix |
| 6 | `WatchlistScreen.jsx` line 87 — `claims.reduce((max, claim) => Math.max(max, claim.attentionScore ?? 0), 0)` | Same class of issue as #5 | **Disclosed only, not fixed** — same file confirmed unreachable (superseded by Watchlist Folders/Workspaces per the sidebar's own comment) |
| 7 | Decision Center / Watchlist Folders / Decision Timeline — a real "Couldn't load..." error banner rendered directly above an unrelated "nothing to show" empty-state message for a Guest (no beta identity) session | Not a fabrication — the error is real and the empty state is real — but their simultaneous co-presentation reads as contradictory | **Disclosed only, not fixed this session** — a presentation/sequencing issue (which message should suppress the other), not a live-data-integrity defect; tracked previously in `FINAL_CEO_REVIEW.md`/`LAST_1_PERCENT.md` |
| 8 | `worldState.js` — "Market Regime" (`risk-on`/`risk-off`/`neutral`) | This codebase has no dedicated regime-classification endpoint; the label is honestly derived as a disclosed proxy from real tone/Fear & Greed data | **Not a defect** — already explicitly disclosed in `WORLD_STATE_ENGINE.md` from `LIVING-WORLD-001`; re-confirmed still accurate, listed here only for completeness of the register |

## Explicitly Checked and Found Clean (No Register Entry Needed)

- Every confidence-value render site in `.jsx` — no `?? 0` / `|| 0` fallback pattern found anywhere.
- All `localStorage` usage (8 call sites) — theme preference, locale, onboarding-seen flags, and a cached beta-user display label; none present stale/cached data as if it were live.
- Personal Intelligence Workspace's "Demo data" banner — correctly scoped to only the Preferences section, not a blanket claim over the whole screen.
- Market Positioning's per-symbol "Market cap unavailable" / "Unavailable this session: shortInterest, longInterest, float" disclosures — genuine, itemized, not generic.
