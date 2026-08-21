# ImpactOne — Project One-Pager

> Living overview of the product, backend modules, stored data, and frontend surfaces. Update this document when a major screen, API domain, database model, provider, or product workflow changes.

**Last reviewed:** 2026-08-15
**System:** React frontend + Express backend + PostgreSQL/Prisma + optional Redis + external market-data providers

## What ImpactOne does

ImpactOne is an investment-intelligence platform. It collects market information, analyzes it with specialized agents, turns evidence into claims and recommendations, remembers what happened, and shows investors what deserves attention.

```text
Market data → Agents → Intelligence events → Claims → Recommendations
                                              ↓
Investor ← React screens ← Express API ← PostgreSQL outcomes and history
```

## Product modules

| Module | What it does | Saved in PostgreSQL | Main frontend surfaces |
|---|---|---|---|
| Identity & accounts | Beta invites, onboarding, login, plans, sessions, usage | Users, beta users, sessions, plans, subscriptions, usage counters, investor profiles | Invite gate, onboarding, My Profile, Settings |
| Portfolio | Tracks a simulated investment account | Portfolios, positions, orders, trades, cash ledger, performance snapshots | Portfolio, Portfolio Workspace |
| Watchlists & workspaces | Organizes monitored symbols and research notes | Watchlist folders/items, workspace notes and flags | Workspaces, Watchlist Workspace |
| Alerts & decisions | Tells users what needs attention and tracks handling | Price alerts, notifications, decision states | Alerts, Notification Center, Decision Center, Decision Timeline |
| Market data | Fetches quotes, charts, news, filings, macro and alternative data | Normalized events, provider runs and source-quality snapshots; many live responses are only fetched/cached | Daily Feed (merges saved provider events and shows each event's source and data type), Market Positioning, charts, stock side panel |
| Intelligence agents | Runs 15 registered domains: technical, Fibonacci, news, symbol sentiment, market sentiment, earnings, valuation, analyst, ETF, insider, institutional, macro, short-interest, options and public alternative-data analysis | Durable results flow into events, claims, traces and recommendations | AI Analysis, Intelligence Workspace, Mission Control |
| Intelligence Bus | Normalizes agent output and preserves provenance | Intelligence bus events and canonical events | Normally consumed indirectly by claims and recommendations |
| Claims | Maintains testable investment theses with evidence and invalidation rules | Claims, evidence ledger, transitions and claim outcomes | Stock panel, Morning Brief, intelligence views |
| Recommendations | Produces the canonical actionable view | Recommendations, feedback, lifecycle events, decision traces and run logs | Recommendations, Today, Decision Center |
| Investment committee | Combines competing evidence into one synthesis | Committee conclusions are preserved through decision traces, recommendations and evidence references | Recommendation explanation, Intelligence Console |
| Options | Tracks options flow, open interest and derived signals | Flow prints, open-interest snapshots and options signals | Stock panel and intelligence screens |
| Market sentiment | Scores market mood by region and dimension | Market sentiment snapshots | Market Dashboard, Market Intelligence Workspace |
| Themes & world memory | Remembers narratives, causal links, predictions and lessons | Theme snapshots, world-memory records/links/state changes/predictions/lessons | Themes, Impact Graph, Global Intelligence |
| Learning & calibration | Measures whether claims and recommendations were correct | Outcomes, methodology versions, score audits, source snapshots, analytics and feedback | Personal Progress, calibration and AI-performance dashboards |
| Morning Brief | Builds the daily prioritized investor view | Daily brief snapshots plus data from the source modules above | Today/Home |

## What users see

**Primary investor flow:** Today → Daily Feed / evidence → Decision Center → Portfolio or live Chart. Today deliberately shows only the morning brief, portfolio impact, qualified recommendations and a compact timeline. The timeline prioritizes held/watchlist symbols and broad macro events, caps each window at five items, and leaves unrelated public-source updates for the full Daily Feed.

**Advanced tools:** Flagship, 3D Workspace, Market Dashboard, Workspaces, Mission Control, intelligence workspaces, Decision Timeline, Market Positioning, Global Intelligence, AI Analysis, Recommendations, Themes and Alerts.

**Mobile navigation:** Today, Daily Feed, Portfolio, Chart, Recommendations and My Profile. The Chart screen uses the shared advanced candlestick renderer with real OHLCV bars; the local free-data default is one month.

**Developer-only:** Intelligence Console, Health Dashboard, Admin Dashboard and AI Performance Dashboard. These require `VITE_DEV_CONSOLE=true`.

## What lives outside PostgreSQL

- Current quotes, news and some provider responses may be fetched live or cached rather than stored permanently.
- Redis is optional and holds temporary shared cache data.
- Browser `localStorage` contains limited device/session preferences and some legacy state.
- Some agent diagnostics and scheduler state are kept in process memory.
- Several specialized frontend workspaces still contain presentation mock-data files; unavailable backend providers must be shown as unavailable, not presented as real data.

## Current live data sources

- **Markets and company data:** Finnhub (quotes, company data and upcoming US earnings); Massive/Polygon (end-of-day price history); NewsAPI (development/testing news); State Street SPDR sector-ETF holdings (XLK, XLF, XLE and XLV — holdings, not real-time fund flows); Binance Futures funding rate and open interest for BTC, ETH and SOL (single exchange, not market-wide).
- **Market-wide weekly strategy scan:** Nasdaq Trader's official Nasdaq/other-exchange directories define the daily US operating-company universe (5,220 symbols in the 2026-08-15 verification). A batched weekly-close prefilter covers every symbol; only possible candidates receive full OHLC Fibonacci validation and the registered-agent committee gate. Scan progress persists locally under `.cache/`, while only committee-approved setups appear as recommendations.
- **Official public sources:** SEC EDGAR filings, FRED macro data, U.S. Treasury yield curve, Federal Reserve Board press releases and FOMC communications, European Central Bank monetary-policy decisions, CFTC Commitments of Traders, FINRA daily short-selling volume, openFDA drug recalls and NASA space-weather alerts.
- **Other public sources:** Polymarket public market probabilities and the available public congressional-disclosure mirror. The alternative-data agent combines these with CFTC COT and SEC evidence; a valid empty response remains explicitly empty.
- **Free resilience fallbacks:** company name, CIK and sector resolution first use configured live sources and then SEC/Massive reference data. Shared 24-hour reference caching prevents duplicate quota use across the insider, institutional and ETF agents.
- **Deferred integrations:** Patent monitoring (USPTO requires ID.me verification; EPO OPS is not connected), Telegram (requires a bot in authorised channels), Reddit (requires explicit API approval), and X, TipRanks, Zacks, Finviz and equity-options flow (paid access or licence). The product must show unavailable/deferred data as such until an authorised source is connected.
- **Source transparency:** the internal Provider Inventory labels connected providers as live, paid/unlicensed sources as unconfigured, and stubs as fixtures. It also identifies sources that rely on locally configured keys.

## Central data chain

```text
ProviderRunLog
   ↓
CanonicalEvent / IntelligenceBusEvent
   ↓
Claim + ClaimEvidence + ClaimTransition
   ↓
Recommendation + DecisionTrace
   ↓
Outcome / ClaimOutcome
   ↓
Calibration, source scoring and learning
```

## Sources of truth

- Database: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Backend API registry: [`backend/routes/index.js`](../backend/routes/index.js)
- Frontend screen registry: [`frontend/src/layout/screenRegistry.js`](../frontend/src/layout/screenRegistry.js)
- Desktop navigation: [`frontend/src/layout/Sidebar.jsx`](../frontend/src/layout/Sidebar.jsx)
- Mobile navigation: [`frontend/src/layout/BottomNav.jsx`](../frontend/src/layout/BottomNav.jsx)
- Full documentation index: [`docs/README.md`](README.md)
- Agent information map: [`docs/product/AGENT_INFORMATION_MAP.md`](product/AGENT_INFORMATION_MAP.md)
- Master specification: [`docs/specification/README.md`](specification/README.md)

## Maintenance rule

Review this one-pager whenever a change does any of the following:

- adds or removes a Prisma model;
- adds or removes a major backend route domain;
- changes primary or mobile navigation;
- adds or removes a user-facing module;
- changes which data is live, cached, mocked or persisted;
- changes the canonical event → claim → recommendation → outcome flow.

Keep this page conceptual and short. Put implementation detail in the relevant architecture or engineering document and link to it here only when it changes the overall system model.
