# ImpactOne UX Recommendations

Date: 2026-07-11  
Scope: Every current screen in the frontend app  
Goal: Improve speed, clarity, and decision quality using patterns inspired by Bloomberg Terminal, Perplexity AI, Palantir Foundry, TradingView, and ChatGPT.

## 1. Design Lens Used

Bloomberg Terminal patterns to borrow
- Dense but structured information hierarchy
- Keyboard-first navigation and command workflows
- High-signal defaults with minimal decorative noise

Perplexity AI patterns to borrow
- Answer-first UI blocks
- Citation and evidence transparency
- Follow-up question pathways

Palantir Foundry patterns to borrow
- Operational workflows over static dashboards
- Clear state transitions and action ownership
- Context-aware drill-down paths

TradingView patterns to borrow
- Fast chart interaction and multi-timeframe context
- Alert and watchlist ergonomics
- At-a-glance visual encoding of trend and risk

ChatGPT patterns to borrow
- Conversation memory and progressive refinement
- Fast iteration loops from question to actionable output
- Explainability and confidence caveats in plain language

## 2. Global UX Improvements (All Screens)

Speed improvements
- Add global command palette for navigation, ticker jump, and actions.
- Add keyboard shortcuts for the top 8 workflows.
- Preload likely next screens based on user intent.
- Introduce optimistic state updates for lightweight actions like watchlist operations.

Clarity improvements
- Standardize one header pattern per screen: objective, key metric, last update, primary action.
- Display freshness indicators on all live data blocks.
- Normalize terminology across screens: confidence, risk, impact, conviction.

Decision-making improvements
- Add explicit action framing on each major card: Buy, Wait, Reduce, Hedge, Ignore.
- Add “why this matters now” and “what would invalidate this signal” everywhere.
- Add evidence provenance chips with source count and confidence band.

## 3. Screen-by-Screen Recommendations

## 3.1 Dashboard Screen

Screen files
- [frontend/src/screens/DashboardScreen.jsx](frontend/src/screens/DashboardScreen.jsx)
- [frontend/src/components/DashboardHome.jsx](frontend/src/components/DashboardHome.jsx)

Current role
- Primary command center with brief, priorities, risk panel, opportunities, and archive preview.

UX improvements
- Speed: Replace multiple independent polling loops with a unified “market heartbeat” update pipeline and staged rendering.
- Speed: Add keyboard quick actions for top decisions directly from priority cards.
- Clarity: Promote a single “Today’s Decision Stack” rail at top with exactly 3 recommended actions.
- Clarity: Add explicit stale-data badges per section instead of only global freshness clues.
- Decision: Add scenario toggle (base, bull, bear) that re-scores priority cards in real time.
- Decision: Add one-click “promote to watchlist,” “open in analysis,” and “set alert threshold” from each card.

Inspiration mapping
- Bloomberg: Decision stack and keyboard actions.
- Perplexity: Evidence-first reasoning snippets.
- Foundry: Action-oriented workflow cards.

Priority
- Now.

## 3.2 AI Analysis Screen

Screen file
- [frontend/src/screens/AiAnalysisScreen.jsx](frontend/src/screens/AiAnalysisScreen.jsx)

Current role
- Deep ticker analysis with quote, AI report, committee output, alt signals, and comparisons.

UX improvements
- Speed: Parallelize visible loading with progressive skeleton reveal by section, not full-page lock.
- Speed: Cache recent ticker sessions and allow instant back/forward ticker switching.
- Clarity: Introduce “thesis card” at the top with recommendation, confidence, horizon, and invalidation conditions.
- Clarity: Collapse verbose sections by default and surface only headline insight + expandable evidence.
- Decision: Add explicit “decision worksheet” panel: entry zone, risk level, position size suggestion, kill-switch criteria.
- Decision: Add “what changed since last analysis” diff view with red/green deltas.

Inspiration mapping
- Perplexity: Answer-first synthesis with citations.
- ChatGPT: Follow-up prompts beneath each conclusion.
- TradingView: Stronger chart and timeframe controls.

Priority
- Now.

## 3.3 Watchlist Screen

Screen file
- [frontend/src/screens/WatchlistScreen.jsx](frontend/src/screens/WatchlistScreen.jsx)

Current role
- Portfolio-adjacent watchlist with AI score cards and simple add/remove actions.

UX improvements
- Speed: Add bulk actions and quick filters (top risk, top opportunity, high volatility).
- Speed: Support keyboard ticker add and batch paste input.
- Clarity: Separate price change and percent change explicitly to avoid interpretation mistakes.
- Clarity: Introduce sortable columns even in card mode via compact list toggle.
- Decision: Add watchlist “triage mode” with 3 bins: Act Now, Monitor, Ignore.
- Decision: Add per-symbol alert sensitivity controls directly in card footer.

Inspiration mapping
- TradingView: Fast watchlist ergonomics.
- Bloomberg: Dense list mode with sortable fields.

Priority
- Now.

## 3.4 Portfolio Screen (Legacy Virtual Portfolio)

Screen file
- [frontend/src/screens/PortfolioScreen.jsx](frontend/src/screens/PortfolioScreen.jsx)

Current role
- Simulated portfolio analytics, positions, trade history, and rules.

UX improvements
- Speed: Add quick “risk lens” tabs: Concentration, Drawdown, Exposure, Liquidity.
- Speed: Virtualized long tables for trades and position history.
- Clarity: Add a clear banner separating simulated metrics from real-market references.
- Clarity: Replace metric wall with grouped “Portfolio Health” sections.
- Decision: Add rebalance recommendations with expected risk/return delta.
- Decision: Add scenario stress panel for macro shocks.

Inspiration mapping
- Foundry: Operational playbooks and state transitions.
- Bloomberg: Portfolio risk summary discipline.

Priority
- Next.

## 3.5 Portfolio Engine Screen (Server-Owned Paper Trading)

Screen file
- [frontend/src/screens/PortfolioEngineScreen.jsx](frontend/src/screens/PortfolioEngineScreen.jsx)

Current role
- Persistent paper-trading engine with manual order flow and transaction logs.

UX improvements
- Speed: One-line order ticket with keyboard submission and validation hints before submit.
- Speed: Sticky mini-ticket on scroll for rapid iterative entries.
- Clarity: Show order impact preview before execution: cash after, exposure after, risk score after.
- Clarity: Split “performance timeline” from “execution log” into separate tabs.
- Decision: Add post-trade review panel with did-this-improve-portfolio metrics.
- Decision: Add AI-assisted order guardrails for over-concentration and high-risk entries.

Inspiration mapping
- Bloomberg: Ticket + impact preview.
- TradingView: Execution ergonomics.
- Foundry: Closed-loop action feedback.

Priority
- Next.

## 3.6 Global Intelligence Screen

Screen file
- [frontend/src/screens/GlobalIntelligenceScreen.jsx](frontend/src/screens/GlobalIntelligenceScreen.jsx)

Current role
- Macro/geopolitical feed, country map, capital flows, and scan coverage.

UX improvements
- Speed: Add map-first navigation with click-to-filter feed by country/region.
- Speed: Add precomputed topical bundles to reduce cognitive load (rates, energy, geopolitics, semis).
- Clarity: Replace long prose cards with structured event schema: trigger, impact path, confidence, invalidation.
- Clarity: Add confidence distribution visualization for top events.
- Decision: Add “portfolio relevance score” next to each global event.
- Decision: Add “if true, do X / if false, do Y” action templates.

Inspiration mapping
- Foundry: Operational geopolitical workflow.
- Perplexity: Source-grounded summaries.
- Bloomberg: Map and macro context discipline.

Priority
- Now.

## 3.7 Alerts Screen

Screen file
- [frontend/src/screens/AlertsScreen.jsx](frontend/src/screens/AlertsScreen.jsx)

Current role
- Displays active alerts from live intelligence feed.

UX improvements
- Speed: Add real-time stream updates instead of only request-time fetch.
- Speed: Add alert batching and keyboard triage actions.
- Clarity: Add severity, confidence, and affected assets as fixed metadata chips.
- Clarity: Add explainability drawer for each alert with evidence and last state transition.
- Decision: Add explicit user actions: Act, Snooze, Dismiss, Escalate.
- Decision: Add personalized “alert quality feedback” to improve future ranking.

Inspiration mapping
- TradingView: Alert workflow ergonomics.
- Foundry: State machine from signal to action.

Priority
- Now.

## 3.8 Market News Screen

Screen file
- [frontend/src/screens/MarketNewsScreen.jsx](frontend/src/screens/MarketNewsScreen.jsx)

Current role
- Narrative layer for top stories and thematic summary.

UX improvements
- Speed: Replace static mock block with live, source-tagged ingestion and near-real-time refresh.
- Speed: Add “read in 30s” compressed briefing mode.
- Clarity: Add impact tags per story: sectors, tickers, expected duration, confidence.
- Clarity: Add source and timestamp prominence.
- Decision: Add “convert story to trade thesis” button into AI analysis workflow.
- Decision: Add consensus-vs-contrarian indicator for each story cluster.

Inspiration mapping
- Perplexity: Source transparency and concise synthesis.
- Bloomberg: Headline triage and market relevance tagging.

Priority
- Now.

## 3.9 Settings Screen

Screen file
- [frontend/src/screens/SettingsScreen.jsx](frontend/src/screens/SettingsScreen.jsx)

Current role
- Static placeholder for appearance and notification settings.

UX improvements
- Speed: Add profile presets (day trader, swing trader, macro investor, long-only allocator).
- Speed: Add instant preview for layout density and alert cadence changes.
- Clarity: Organize settings into tabs: Account, Alerts, Risk, Data, Appearance, Privacy.
- Clarity: Show current effective configuration summary at top.
- Decision: Add “decision style” controls that tune recommendation aggressiveness and risk tolerance.
- Decision: Add trust controls: evidence strictness, model confidence threshold, source preferences.

Inspiration mapping
- ChatGPT: Model behavior controls.
- Foundry: Role-based configuration philosophy.

Priority
- Next.

## 3.10 Header and Navigation (Cross-Screen Control Surface)

Files
- [frontend/src/components/Header.jsx](frontend/src/components/Header.jsx)
- [frontend/src/layout/MainLayout.jsx](frontend/src/layout/MainLayout.jsx)

Current role
- Global search, quick actions, portfolio glance, alert badge, and view switching.

UX improvements
- Speed: Introduce command palette invoked by shortcut for ticker, screen, and action jumps.
- Speed: Add persistent recent items and “resume last analysis.”
- Clarity: Keep one global objective bar with active context, selected ticker, and current portfolio mode.
- Clarity: Add global sync status and latency indicator.
- Decision: Add always-available “Ask ImpactOne” input with context-aware suggestions.
- Decision: Add quick decision templates in menu: hedge, reduce concentration, follow catalyst.

Inspiration mapping
- Bloomberg: Keyboard-first navigation.
- ChatGPT: Contextual quick prompting.

Priority
- Now.

## 4. Prioritized UX Backlog (Speed, Clarity, Decision)

Top 10 immediate moves
1. Add command palette and keyboard shortcuts.
2. Add evidence and confidence chips on every actionable insight.
3. Add decision stack at top of dashboard.
4. Add alert action state machine (act/snooze/dismiss/escalate).
5. Add AI analysis change-diff against prior run.
6. Separate absolute versus percentage move labels consistently.
7. Add portfolio impact preview before order placement.
8. Add map-to-feed filtering in global intelligence.
9. Add live, source-tagged market news ingestion and impact labels.
10. Add settings profiles and decision-style controls.

## 5. Success Metrics to Track

Speed metrics
- Time to first actionable insight
- Time from alert to user action
- Median screen transition latency

Clarity metrics
- Percentage of insights with source and confidence visible
- Reduction in “unknown next step” user feedback
- Drop in bounce rate from analysis and alerts screens

Decision metrics
- Rate of explicit actions taken per session
- Watchlist-to-analysis-to-decision conversion
- Portfolio outcome attribution usage rate

## 6. Final Recommendation

ImpactOne should evolve from a rich data dashboard into a decision operating system. The fastest path is to combine Bloomberg-style density discipline, Perplexity-style answer transparency, Foundry-style action workflows, TradingView-style market ergonomics, and ChatGPT-style conversational iteration into one coherent control surface.
