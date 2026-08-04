# Repository Cleanup — RELEASE-CANDIDATE-001

Exact record of every change made this phase. Nothing here is a redesign — every change either deletes something with zero real usage or documents something already true in the code.

## Files Deleted

```
frontend/src/components/KpiCard.jsx          — zero real importers (confirmed via basename grep)
frontend/src/components/WatchlistTable.jsx   — zero real importers (confirmed via basename grep)
frontend/src/components/AIInsightsSidebar.jsx — zero real importers (one non-import comment mention, now updated)
```

## `frontend/src/config/apiConfig.js` — Comment Updated

```diff
 // Phase PHONE-INSTALLATION-001 — single source of truth for the public
-// API origin. Four call sites (apiClient.js, analytics.js,
-// DashboardFooter.jsx, AIInsightsSidebar.jsx) previously each duplicated
-// the same `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"`
-// line. That fallback is harmless on a developer's own machine, but a
+// API origin. Three call sites (apiClient.js, analytics.js,
+// DashboardFooter.jsx) previously each duplicated the same
+// `import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"`
+// line. (A fourth, AIInsightsSidebar.jsx, was removed as dead code in
+// RELEASE-CANDIDATE-001 — it had zero real importers.) That fallback is
+// harmless on a developer's own machine, but a
```

No functional code in this file changed — `API_BASE_URL`'s export is identical.

## `package.json` — Unused Dependency Removal Attempted, Then Reverted

`react-router-dom` was confirmed genuinely unused (zero real usage anywhere in `frontend/src`/`backend`; this app uses state-driven screen-swap navigation, not routing) and was removed, then **reverted** before committing. Reason: `package.json`'s working tree already carried unrelated, pre-existing uncommitted additions (`bcryptjs`, `jsonwebtoken`, `stripe` — confirmed absent from the last commit via `git show HEAD:package.json`, so these predate this session's phases entirely) from outside this session's work. Committing the file with `react-router-dom` removed would have also committed those three unrelated additions under this phase's name, misattributing someone else's in-progress change. `package.json` is left exactly as this phase found it. The finding itself remains valid and is recorded in `TECHNICAL_DEBT_REPORT.md` §6 for a future phase (or the owner of those pending additions) to act on together, once that entanglement is resolved.

## `ENVIRONMENT_SETUP.md` — Documentation Added

Added a new "Frontend Build-Time Variables" section documenting `VITE_API_BASE_URL` and `VITE_PORTFOLIO_ENGINE` — both already read in real code, previously undocumented. No existing content was changed or removed.

## What This Cleanup Deliberately Did Not Touch

- Any file under `frontend/src/components/nova/` (the design-system showcase, including its own `EmptyState`/`OfflineBanner` — see `TECHNICAL_DEBT_REPORT.md` §1).
- Any screen's loading/error/empty-state handling or cache usage (§12/§13).
- Any naming/folder-structure convention (§11).
- The backend/frontend startup-validation shape mismatch (§14).
- The ~90 untracked root-level research/strategy `.md` files from other, concurrent work in this shared repository — not this phase's own work, and not touched.

## Verification

- Backend full regression and frontend full regression: see commit message for exact pass counts.
- Production build: succeeded after every change above — confirms nothing in the live app depended on the removed files or the removed dependency.
