# FOUNDER_WEEK_REVIEW.md — Phase FOUNDER-WEEK-AUDIT-001

**Mission:** act as the founder using ImpactOne for an entire working week — a real, hands-on evaluation of every named workflow, not a code review. No code was modified. Method: live browser interaction against a freshly started backend/frontend (both restarted clean this phase), real clicks, real navigation, real content read exactly as a daily user would encounter it — not inferred from source. HEAD at review time: `6c863d6`.

A note on the account used: this review used the existing default/no-invite-code ("Guest") session, since that is exactly what a founder opening the app without first following an invite link would encounter. Several findings below are specific to that state and are labeled as such — they are not necessarily what happens with an active invite-coded identity, but they are real, reproducible, and worth knowing since nothing in the product visibly explains the difference.

---

## Workflow-by-workflow review

Each workflow rated on the mission's 10 dimensions, using ✅ (strong) / ⚠️ (friction found) / ❌ (broken or contradictory) shorthand, with the concrete evidence underneath.

### 1. Morning market scan (Home)

**Time: ~10 seconds to the essentials, several screens' worth of scrolling for everything. Clicks: 0 (it's the landing page). Cognitive load: ⚠️. Visual clarity: ✅. Trust: ⚠️. Speed: ✅. Repetition: ⚠️. Friction: ✅ low to start. Missing info: ⚠️. Decision confidence: ⚠️.**

The single best-designed moment in the whole product is right at the top: a 3-bullet "morning brief" (Market / Portfolio / Top for you) plus an "Action needed: Yes — NVDA" banner and two buttons ("Review today's decisions," "Open portfolio"). A founder genuinely could read just this and know what to do in under 15 seconds — this is exactly the kind of design the rest of the review holds everything else to.

Below that, the same page keeps going: Morning Brief detail, Recommendations detail, Portfolio detail, "Today For You" (5 items), Intelligence Timeline, "What changed in the platform's beliefs," Active Alerts — all on **one continuously scrolling screen**, most of it re-stating information the top summary already gave. **Repetition, confirmed**: "Today For You"'s first two items ("AAPL earnings" and "Earnings calendar concentration") both carry the identical justification "You hold a position this directly affects" with nothing distinguishing why two separately-listed items matter in the same way.

### 2. Breaking news (Daily Feed)

**Time: fast to load, slow to read all 12 items. Clicks: 2 (More tools → Daily Feed) from Home. Cognitive load: ⚠️. Visual clarity: ✅. Trust: ❌. Speed: ✅. Repetition: ❌. Friction: ⚠️. Missing info: ✅ (each item does show affected holdings/relevance). Decision confidence: ❌.**

**The single most damaging finding of this whole review, confirmed live:** the first two items in today's real feed, "AAPL earnings" and "Earnings calendar concentration" — two headlines describing genuinely different things — are **byte-for-byte identical** in every other field: Importance 63/100, Confidence 67/100, Horizon "1-4 weeks," "1 min read," the exact same "Affected holdings" list (AAPL, NVDA, MSFT, AMZN, BTC, ETH, Oil, Natural Gas, Copper, Gold), and the exact same "Attention score: 69/100." A founder reading both cannot tell whether the platform is separately, genuinely re-evaluating each event, or just relabeling one templated output twice. This directly undermines "Decision confidence" for the whole screen, not just these two items.

### 3. AI Analysis

**Time: 20-40 seconds to skim, much longer to actually read. Clicks: 2 from Home (More tools → AI Analysis), plus typing/selecting a ticker. Cognitive load: ❌. Visual clarity: ⚠️. Trust: ✅ (where labeled). Speed: ⚠️ (multiple sections load independently, staggered). Repetition: N/A. Friction: ⚠️. Missing info: N/A. Decision confidence: ⚠️.**

Genuinely strong on honesty: "Wall Street Analyst Consensus" is clearly subtitled "THIRD-PARTY DATA — NOT AN IMPACTONE RECOMMENDATION" (a real, confirmed-still-correct fix from this product's own history), and "Fear & Greed" honestly says "unavailable right now" rather than fabricating a number. But the screen has **9 separate sections** (Overview, AI Report, Claims-Based Analysis, Market Impact, Alt Data, Intelligence, Committee, Sector Impact, Compare), each with its own scores/labels, and nothing tells the founder which one to read first or how they relate. A founder wanting "just tell me what to think about NVDA" has to read all nine and synthesize it themselves every single day.

### 4. Recommendations

**Time: ~20 seconds to scan 4 active recommendations. Clicks: 2 from Home. Cognitive load: ✅. Visual clarity: ✅. Trust: ❌. Speed: ✅. Repetition: ❌. Friction: ✅. Missing info: ✅ (Why now/Would prove wrong/Watch next are all present). Decision confidence: ❌.**

The card format itself (action, confidence, risk, upside/downside, size, "Why now"/"Would prove it wrong"/"What would change my mind"/"Watch next") is genuinely excellent — the single best-structured piece of reasoning in the product. But **3 of the 4 active recommendations this week (GOOGL, NVDA, MSFT) share byte-identical text** for "Would prove it wrong" ("Compute buildout guidance is walked back next quarter"), "What would change my mind" ("Prediction markets lean unfavorable"), and "Watch next" ("Sector concentration: 47% of portfolio in this sector"), with near-identical confidence (80/77/80) and identical upside/downside/size bands. All 4 active recommendations this week say "Reduce" — no diversity of action at all. A founder would reasonably start to doubt whether these are 4 independent verdicts or 1 verdict copy-pasted onto 3 tickers that happen to share a sector.

### 5. Portfolio

**Time: ~10 seconds. Clicks: 1 from Home (sidebar). Cognitive load: ✅. Visual clarity: ✅. Trust: ✅. Speed: ✅. Repetition: ✅ none found. Friction: ✅. Missing info: ✅. Decision confidence: ✅.**

The strongest workflow in the whole review. Cash/Total Value/Realized P/L/Unrealized P/L, a real open-positions table, an honest "No prior-day snapshot yet" empty state instead of a fabricated comparison, and a manual order form with no auto-execution — everything a founder needs, in one screen, with nothing to click through. "Reset virtual portfolio" (a destructive action) was seen but not tested this session to avoid destroying the account's real state for later workflows.

### 6. Watchlist

**Time: varies wildly by entry point (see below). Clicks: 1-2. Cognitive load: ❌ (three different destinations). Visual clarity: ⚠️. Trust: ⚠️. Speed: ⚠️. Repetition: N/A. Friction: ❌. Missing info: ⚠️. Decision confidence: N/A (mostly empty for this account).**

**A real, confusing navigation problem, confirmed live:** there are at least **three separately reachable "watchlist" destinations** — "Workspaces" (sidebar Primary item, real name: Watchlist Folders), "Watchlist Workspace" (an Advanced-tools item), and a "Watchlist" link inside My Profile's "More" section — with no visible explanation of how they differ. Worse, **they behave inconsistently for this account**: "Workspaces" genuinely failed to load ("Couldn't load your watchlist folders right now" — the console shows this is because "a beta user identity is required for watchlist folders," a real 400 response), while "Watchlist Workspace" loaded fine with an honest empty state ("Add a ticker to your watchlist to see intelligence here"). A founder without an active invite code hits one dead end and one working screen with no way to know in advance which is which.

### 7. Alerts

**Time: ~5 seconds. Clicks: 2 from Home. Cognitive load: ✅. Visual clarity: ✅. Trust: ❌. Speed: ✅. Repetition: ❌. Friction: ✅. Missing info: N/A. Decision confidence: ❌.**

Same defect as Daily Feed, reproduced independently on a different screen: "Fed rate hike" and "FOMC Rate Decision" — two distinct alerts — carry the exact same explanation text ("most comparable to 'Rate Hikes' (88% historical similarity)...") and identical Confidence 81/100. This is not an isolated Daily Feed bug — it's a cross-screen pattern from a shared underlying data source, now confirmed present in at least 3 of the 12 reviewed workflows (Home, Daily Feed, Alerts).

### 8. Themes

**Time: ~5 seconds per card to scan the grid, ~15 seconds per theme once expanded. Clicks: 2 from Home, +1 per theme to expand. Cognitive load: ⚠️. Visual clarity: ✅. Trust: ✅ (content itself, once read, is genuinely thoughtful). Speed: ✅. Repetition: ❌ (within a single theme). Friction: ⚠️. Missing info: ❌ (the grid itself). Decision confidence: ✅ once expanded.**

The grid of 7 theme cards (AI/Quantum/Defense/Energy/Space/Cyber/Healthcare) shows **only a name and a "Show details" button — zero preview information**, so a founder has to click into every single one just to learn whether anything changed this week. Once expanded, though, the content is good (Maturity/Confidence, "Theme Evolution: what's new," counterarguments, exposed companies/ETFs) — **except the same one sentence is printed three separate times in a row** within a single theme's detail view (in the main summary, again under "Why" in Theme Evolution, and again under Supporting Evidence) — a real, self-contained repetition problem distinct from the cross-item templating found elsewhere.

### 9. Profile

**Time: ~20 seconds. Clicks: 1 from Home. Cognitive load: ✅. Visual clarity: ✅. Trust: ✅. Speed: ✅. Repetition: N/A. Friction: ✅. Missing info: ✅. Decision confidence: ✅.**

The second-strongest screen in the review. Suggested-portfolio breakdown, an interactive compound-interest simulator with adjustable sliders, and a "Your progress" section that honestly says "More feedback needed... (5 recorded so far, need at least 6)" rather than fabricating a trend from too little data. Consistently disclosed as "an illustration, not a promise" throughout.

### 10. Settings

**Time: ~5 seconds. Clicks: 1 from Home. Cognitive load: ✅. Visual clarity: ✅. Trust: ✅. Speed: ✅. Repetition: N/A. Friction: ⚠️ minor. Missing info: N/A. Decision confidence: N/A.**

Honestly labeled: Appearance and Notifications are both explicitly "not yet configurable," listing the current fixed defaults rather than pretending to be interactive settings. Minor friction only: a settings screen with two of its three sections un-adjustable is itself a small amount of clutter — a founder might click in expecting to change something and find nothing to change.

### 11. Flagship

**Time: several seconds to load the 3D scene. Clicks: 1 from Home. Cognitive load: ⚠️. Visual clarity: N/A (not independently visually confirmed this session — see note below). Trust: ⚠️. Speed: ⚠️. Repetition: N/A. Friction: ⚠️. Missing info: ⚠️. Decision confidence: N/A.**

The scene does load a real WebGL canvas and a "Mission Chain" toolbar button (confirmed via direct DOM inspection). Two real errors surfaced in the console during load: the scene's own ambient market-proxy quote failed with "Ticker not found," and its price-alerts panel failed with the same "a beta user identity is required" gating seen elsewhere. *Note: this session's screenshot tool repeatedly returned a stale image of the Home screen instead of the actual Flagship canvas despite the DOM confirming Flagship was active — disclosed honestly rather than used to make a visual claim I couldn't actually verify.*

### 12. 3D Workspace

**Time: similar to Flagship. Clicks: 1 from Home. Cognitive load: ⚠️. Trust: N/A. Friction: ⚠️. Missing info: N/A. Decision confidence: N/A.**

**Confirmed near-duplicate of Flagship**: structurally the identical shell component (`workspace3d-root`), with the only observed difference being a single toolbar button labeled "Mission Control" instead of Flagship's "Mission Chain." A founder navigating both from the sidebar would reasonably wonder why two separate nav entries exist for what appears to be the same underlying experience.

## Cross-cutting pattern found in this review, not specific to one screen

**Navigation depth:** 5 of the 12 named workflows (AI Analysis, Recommendations, Daily Feed, Themes, Alerts) are not directly reachable from the sidebar — they require first expanding "More tools," which then reveals **16 items at once** (Mission Control, Intelligence Workspace, Portfolio Workspace, News Intelligence, Watchlist Workspace, AI Analysis Workspace, Market Intelligence Workspace, Personal Intelligence Workspace, Decision Timeline, Market Positioning, Global Intelligence, AI Analysis, Recommendations, Daily Feed, Themes, Alerts) to scan through. A founder doing a daily routine across these 5 screens repeats this same "expand, scan 16 items, pick one" sequence every single time.

See `WORKFLOW_FRICTION_MAP.md` for every specific friction point mapped to a workflow and a severity, `AUTOMATION_OPPORTUNITIES.md` for what the founder would naturally expect the app to already be doing, and `NEXT_20_IMPROVEMENTS.md` for a prioritized list.
