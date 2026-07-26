# ImpactOne — Release Notes

## Sprint 20: My First Daily Experience

*2026-07-13*

This release rebuilds the first-open experience of ImpactOne around a single question: is this worth opening every morning? It introduces a guided profile setup, a four-question Home screen, a real personalized Daily Feed, and a Theme Dashboard for tracking long-term investment narratives — all while keeping ImpactOne strictly advisory. No trading, brokerage connection, or order execution is introduced in this or any release.

### New: Guided Setup, Under a Minute

On first open, ImpactOne now asks a short series of questions — your age, and optionally your country, experience level, monthly investment amount, goal, risk tolerance, and time horizon. Only age is required; every other step can be answered with a single tap or skipped. Immediately after, ImpactOne generates your first AI Investment Profile: a suggested starting allocation across stocks, bonds, and cash, an explanation of why that mix makes sense for you, an expected volatility range, and an interactive compound-interest simulator you can adjust yourself. Every number that depends on future returns is clearly marked as an illustration based on configurable assumptions — never a promise.

### New: Home, Redesigned

Home now answers exactly four questions and nothing else: What happened? Why should I care? How does it affect me? Should I do anything today? The last answer always comes from the same trusted recommendation engine that powers the rest of the app — Home never invents its own opinion.

### New: Daily Feed

Market News is now the Daily Feed, and it's real: every item shows a headline, an AI-written summary, an importance and confidence score, the sectors and companies it touches, a time horizon, its potential impact on your portfolio, its source, and — for anyone who wants to go deeper — the reasoning behind the analysis. The feed is personalized: it's ranked using your age, portfolio, interests, time horizon, and risk profile, so the most relevant items surface first. Personalization only ever changes the order — it never changes what an item says.

### New: Theme Dashboard

Track the long-term stories that matter: AI, Quantum Computing, Defense, Energy, Space, Cybersecurity, and Healthcare. Each theme page shows where it stands today (maturity), the case for it, the evidence behind that case, the counterarguments, the companies and ETFs associated with it, and how confidence in the thesis has trended over time.

### Design

Every new screen was built mobile-first, using ImpactOne's existing visual language — no new design system, no new dependencies. The onboarding flow is intentionally short: no unnecessary questions, single-tap steps, smooth transitions.

### What This Release Is Not

ImpactOne remains advisory-only. This release adds no way to place a trade, connect a brokerage, or execute an order — and none is planned for this product. Every projected number in the AI Investment Profile is explicitly labeled as an illustration, not a forecast or a promise.

### Known Limitations

- The Investor Profile intake accepts free-form values for a few optional fields without full server-side validation. This does not affect the app as shipped (the only client is the onboarding flow itself, which only ever sends well-formed values), but will need to be hardened before any additional client integrates with this API.
- Theme confidence-trend history starts accumulating from this release forward; it does not include simulated or backfilled history.
- Theme theses and the onboarding's educational content are written from a deterministic template today, not generated live per user.

### Compatibility

All existing screens — Dashboard, Portfolio, Recommendations, AI Analysis, Global Intelligence, Watchlist, Alerts, and Settings — are unchanged and continue to work exactly as before. This release changes only the app's default landing screen (Home instead of Dashboard); Dashboard remains one click away in the sidebar.
