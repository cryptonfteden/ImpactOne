# ImpactOne — Project One-Pager

> Living overview of the product, backend modules, stored data, and frontend surfaces. Update this document when a major screen, API domain, database model, provider, or product workflow changes.

**Last reviewed:** 2026-08-04  
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
| Market data | Fetches quotes, charts, news, filings, macro and alternative data | Normalized events, provider runs and source-quality snapshots; many live responses are only fetched/cached | Daily Feed, Market Positioning, charts, stock side panel |
| Intelligence agents | Runs technical, news, sentiment, earnings, valuation, analyst, ETF, insider, institutional, macro, short-interest and options analysis | Durable results flow into events, claims, traces and recommendations | AI Analysis, Intelligence Workspace, Mission Control |
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

**Primary desktop flow:** Today → Flagship/Market Dashboard → Decision Center → Portfolio → Workspaces.

**Advanced tools:** 3D Workspace, Mission Control, intelligence workspaces, Decision Timeline, Market Positioning, Global Intelligence, AI Analysis, Recommendations, Daily Feed, Themes and Alerts.

**Mobile navigation:** Today, Daily Feed, Portfolio, Recommendations and My Profile.

**Developer-only:** Intelligence Console, Health Dashboard, Admin Dashboard and AI Performance Dashboard. These require `VITE_DEV_CONSOLE=true`.

## What lives outside PostgreSQL

- Current quotes, news and some provider responses may be fetched live or cached rather than stored permanently.
- Redis is optional and holds temporary shared cache data.
- Browser `localStorage` contains limited device/session preferences and some legacy state.
- Some agent diagnostics and scheduler state are kept in process memory.
- Several specialized frontend workspaces still contain presentation mock-data files; unavailable backend providers must be shown as unavailable, not presented as real data.

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

## Maintenance rule

Review this one-pager whenever a change does any of the following:

- adds or removes a Prisma model;
- adds or removes a major backend route domain;
- changes primary or mobile navigation;
- adds or removes a user-facing module;
- changes which data is live, cached, mocked or persisted;
- changes the canonical event → claim → recommendation → outcome flow.

Keep this page conceptual and short. Put implementation detail in the relevant architecture or engineering document and link to it here only when it changes the overall system model.
