# Portfolio Intelligence Workspace — Component Map

Every visual element in `frontend/src/screens/PortfolioWorkspaceScreen.jsx` traced to its certified NOVA source. No component was created new this phase.

## Layout primitives (`frontend/src/components/layout/`)

| Component | Used for |
|---|---|
| `Page` | Screen root; carries `dir` from `useI18n()` |
| `Container` | Centers/caps content width |
| `Grid` | 12/8/4-column responsive grid — Portfolio Health KPI tiles (`span 3`), Risk Map sector cards (`span 4`), Winners/Losers two-up layout (`span 6`) |
| `Stack` | Vertical/horizontal flex rhythm (header block, badge rows, KPI card contents) |

## NOVA components (`frontend/src/components/nova/`)

| Component | Section(s) | Notes |
|---|---|---|
| `Card` | All 10 sections + Risk Map's per-sector sub-cards + Health's KPI tiles | `title`/`eyebrow` is the section/tile's single title — never duplicated in the body (X12C.1.1 review lesson applied from the start) |
| `Badge` | Health (return/P&L tone), Risk Map (sector tone), Concentration (Top-1/3/5/HHI), Diversification (largest-weight warning), Winners/Losers (gain/loss tone), Recommendations (action tone), Cash Allocation (weight) | `tone` always derived from a real, signed number (`totalReturnPct >= 0`, `netUnrealizedPnl` sign, etc.) — never a hardcoded tone |
| `ConfidenceBadge` | AI Portfolio Recommendations | Real `qualityScore` per recommendation |
| `Table` | Sector Allocation | Real `<table>`/`<th>`/`<td>` — native accessible table semantics |
| `EmptyState` | Every section's "no data" branch, including Rebalance Suggestions' permanent honest not-available state | Consistent honest-empty-state pattern across the whole screen |
| `Skeleton` | Loading state; AI Portfolio Recommendations while still fetching | Distinguishes "still loading" from "loaded and empty" |
| `Alert` | Error banner (load failure) | `tone="error"` |

## Typography (`frontend/src/styles/typography.css`)

`nova-heading-eyebrow`, `nova-heading-h1`, `nova-heading-subtext`, `nova-text-sm`, `nova-text-xs`, `nova-text-lg` — no legacy `.eyebrow`/`.company-description`/`.subtle` classes anywhere in this screen (enforced by an automated test).

## Client-side computation (not components — arithmetic over real data)

| Function | In file | Computes |
|---|---|---|
| `computeConcentration(positions, totalValue)` | `PortfolioWorkspaceScreen.jsx` | Per-position weight, Top-1/3/5, HHI — all standard formulas over real `marketValue`/`totalValue` |
| `computeSectorRisk(positions, bySector)` | `PortfolioWorkspaceScreen.jsx` | Real per-sector net unrealized P&L, for Risk Map's tone |

These are presentation-layer aggregation, not new backend metrics — every input is a field `portfolioEngineApi.getSummary()` already returns.

## Explicitly NOT used / NOT created

- No new component was added to `components/nova/`.
- No legacy classes: `.company-description`, `.eyebrow`, `.ghost-button`, `.pill`.
- No reuse of `portfolioIntelligenceService`'s synthetic-holdings concentration/risk service (see `PORTFOLIO_WORKSPACE.md` for why).
- No JSX/markup duplicated from `PortfolioEngineScreen.jsx` or `PortfolioScreen.jsx` — both are untouched and use their own `SectionCard`/table markup; this screen shares the NOVA vocabulary established in X12C.0/X12C.1/X12C.2 instead.

## File inventory

| File | Role |
|---|---|
| `frontend/src/screens/PortfolioWorkspaceScreen.jsx` | The screen |
| `frontend/src/screens/PortfolioWorkspaceScreen.test.jsx` | Tests |
| `frontend/src/features/portfolioWorkspace/PortfolioWorkspaceFeature.jsx` | Thin feature wrapper |
| `frontend/src/features/index.js` | Exports `PortfolioWorkspaceFeature` |
| `frontend/src/layout/screenRegistry.js` | `screenMap["Portfolio Workspace"]` |
| `frontend/src/layout/Sidebar.jsx` | `ADVANCED_ITEMS` entry (collapsed "More tools" group — Home, Mission Control, Intelligence Workspace, and the 5-item bottom nav are all untouched) |
| `frontend/src/i18n/locales/en.json` | `nav.portfolioWorkspace` + full `portfolioWorkspace.*` string namespace |
