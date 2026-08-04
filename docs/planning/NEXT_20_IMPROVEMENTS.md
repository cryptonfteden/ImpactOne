# NEXT_20_IMPROVEMENTS.md — Phase FOUNDER-WEEK-AUDIT-001

20 concrete improvements, each tied directly to a specific finding from `FOUNDER_WEEK_REVIEW.md`/`WORKFLOW_FRICTION_MAP.md`, ranked by measurable friction removed — not proposed for their own sake. None of these were implemented this phase (documentation only, per the mission's explicit instruction).

---

## Tier 1 — Trust (fixes a specific, checkable, currently-false-reading experience)

1. **De-duplicate or genuinely differentiate Daily Feed's "AAPL earnings" vs. "Earnings calendar concentration"** — currently identical in every field but the headline. Highest-priority item in this whole review: this is the exact "specific, checkable false claim" class this product's own `BUG_SEVERITY_STANDARD.md` already defines as Critical.
2. **De-duplicate or differentiate Alerts' "Fed rate hike" vs. "FOMC Rate Decision"** — same defect, second independent screen, confirmed live this session.
3. **Give Recommendations' GOOGL/NVDA/MSFT genuinely distinct "Would prove it wrong"/"What would change my mind"/"Watch next" text**, or explicitly, visibly label them as sharing a common sector-level thesis if that's genuinely why they're similar — right now it reads as templating, not shared reasoning.
4. **Reword Decision Center's "this is usually temporary" message** to match reality when the actual cause is a missing identity, not a transient network issue — an inaccurate diagnosis is itself a trust cost, even though this exact screen isn't one of the 12 named workflows.
5. **Remove the redundant repeated sentence within a single Theme's detail view** (same sentence 3 times) — a small, self-contained, easy differentiator between "genuinely evidence-rich" and "one fact stretched across three headings."

## Tier 2 — Navigation friction (removes a click or a guess, every single day)

6. **Add a "Recently used" or founder-pinnable shortcut row above "More tools"** for the 5 named workflows that require expanding it every time (AI Analysis, Recommendations, Daily Feed, Themes, Alerts) — removes one guaranteed click + one 16-item scan, every day, for the founder's own actual routine.
7. **Consolidate the 3 watchlist entry points' naming** ("Workspaces," "Watchlist Workspace," Profile's "Watchlist" link) into one consistent name and, ideally, one destination — or at minimum, add a one-line in-app note explaining the difference where a founder would otherwise have to guess.
8. **Make Watchlist Folders degrade to the same "works without an identity, honest empty state" behavior Watchlist Workspace already has**, instead of a hard failure — removes the one dead-end found this session for a founder without an active invite code.
9. **Give Flagship and 3D Workspace a single shared sidebar entry** (with the two current toolbar views as an in-screen toggle) if they remain this structurally identical — a genuine friction-removal, not a cosmetic merge, since it removes a real "which one do I want" decision confirmed this session.
10. **Add a lightweight badge/count for new Recommendations since last visit**, mirroring the header's existing alert-count pattern ("Open alerts (2 unread)") — the underlying 30-minute autonomous run already exists; only the visibility is missing.

## Tier 3 — Cognitive load (reduces how much a founder has to read/reconcile per visit)

11. **Add a one-line "what's new" preview to each Themes card** before it's expanded, using the "Theme Evolution" computation the detail view already performs — removes the current "click all 7 just to triage" pattern.
12. **Give AI Analysis a single, synthesized "start here" line above its 9 sections** — not a new score, just a plain-language pointer to which section actually matters most for the current symbol (e.g., "biggest driver this week: X" with a jump link) — reduces the need to read all 9 top-to-bottom every time.
13. **Cross-reference Daily Feed and Alerts when they cover the same underlying event**, so a founder reading both doesn't have to notice the overlap themselves.
14. **Persist an "always show full reasoning" preference** for Recommendations/AI Analysis' expandable sections, so a founder who wants full depth every day doesn't re-click the same toggle every day.
15. **Move Home's "Today For You" items' repeated one-line justification to something item-specific** (or collapse genuinely-identical-reason items into one grouped entry) rather than repeating "You hold a position this directly affects" verbatim across multiple distinct headlines.

## Tier 4 — Speed and repetition (smaller, but cheap and cumulative)

16. **Add a visible loading-state distinction on AI Analysis** between "still loading" and "this section has no data" — sections currently load independently and staggered with no per-section progress indicator, so a founder can't tell whether a blank section is still coming or already finished loading empty.
17. **Surface the Recommendation engine's own "Last run" timestamp somewhere more visible than the Engine Status panel** (e.g., next to the Recommendations count on the sidebar/badge from #10) — the data already exists, just buried one click deep.
18. **Shorten Home's single continuously-scrolling page** by collapsing (not deleting) the lower, less time-sensitive sections (Intelligence Timeline, "What changed in the platform's beliefs") behind a single "show more" affordance below the fold, so the daily-relevant top half is reachable without scrolling past sections that rarely change day to day.
19. **Add a settings-screen note clarifying *why* Appearance/Notifications aren't configurable yet** (e.g., "coming after the private beta") rather than just stating the fact — doesn't remove a click, but removes the small "did I do something wrong" moment of finding a settings section with nothing to actually change.
20. **Confirm and, if needed, fix Flagship's ambient market-proxy quote lookup** (observed failing with "Ticker not found" this session) — a small, contained fix that would remove one of the two real console errors found on that screen, independent of the larger Flagship/3D-Workspace consolidation question in #9.

---

## What is explicitly NOT recommended here, and why

- **No new screens.** Every item above works within the product's existing structure.
- **No new AI/scoring logic.** Items 1-4 ask for genuine per-item differentiation or honest labeling, not a new algorithm — the mission's own instruction was not to propose a redesign unless it removes measurable friction, and inventing new scoring machinery would be the opposite of that.
- **No wholesale navigation redesign.** Item 6/9 are additive (a shortcut row, a single merged entry point) rather than a re-architecture of the sidebar itself — the underlying `Primary`/`Advanced`/`Account` tiering already found in this product's own `Sidebar.jsx` is left intact.
