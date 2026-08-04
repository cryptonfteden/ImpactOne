# UX Friction Log — FOUNDER-MODE-001

Every friction point considered this phase, whether it turned out to be a real fix or not — logged honestly so the reasoning is auditable, not just the outcome.

| # | Candidate friction | Screen(s) | Investigated | Outcome |
|---|---|---|---|---|
| 1 | Plain-text empty state instead of the shared component | `AiAnalysisScreen.jsx` | Compared directly against the identical concept on `AiAnalysisWorkspaceScreen.jsx`, which already used `EmptyState` | **Real, fixed** — see `PRODUCTION_POLISH.md` |
| 2 | Plain-text empty state instead of the shared component | `AiAnalysisWorkspaceScreen.jsx` (initial grep hit) | Read the actual surrounding code | **False positive** — already used `EmptyState`; the grep matched a string inside its own `title` prop |
| 3 | Plain-text fallback line inside a hero card | `PortfolioWorkspaceScreen.jsx` | Read the actual surrounding code and its sibling ("real data present") branch | **False positive** — a legitimate, lighter inline pattern consistent with its own sibling branch, not a section-level empty state; applying `EmptyState` here would be a step backward |
| 4 | Leftover `console.log` debug output | Repo-wide | `grep -rn "console\.log("` across `screens/`, `features/`, `components/` | **None found** |
| 5 | Plain `"Loading..."` text instead of a real skeleton | Repo-wide | `grep -rln` for the literal string | Two hits, both in this session's own 3D/Flagship code; one is a legitimate different concern (lazy-loaded code Suspense fallback), one is a stale comment referencing already-replaced text — **no real issue** |
| 6 | Fabricated-`0`-confidence pattern re-appearing on Daily Feed/Recommendations | `MarketNewsScreen.jsx`, `RecommendationsScreen.jsx`, `RecommendationCard.jsx` | Re-ran the exact pattern search that found the real bugs in `LIVE-DATA-INTEGRATION-001` | **None found** — the earlier phase's fix was thorough |
| 7 | Home's loading state flashing blank before data arrives | `HomeScreen.jsx` | Read the actual `isLoading` handling | **Already fixed**, pre-existing (`Sprint 34 — production polish`) — confirmed, not re-touched |
| 8 | Recommendations screen's empty/insufficient-data copy reading as generic/alarming | `RecommendationsScreen.jsx` | Read the actual copy | **Already excellent** — explicit, honest, non-alarming framing already in place; used as the reference standard for evaluating other screens' empty states, including finding #1 above |

## Why This Log Exists

A real usability audit produces more "investigated, no issue" rows than "found and fixed" rows — that's expected, not a sign of a shallow audit. Logging both is what makes the one real fix (#1) credible: it was found by comparison against a real standard already present elsewhere in the codebase (#8, #2's actual implementation), not invented from a generic checklist.
