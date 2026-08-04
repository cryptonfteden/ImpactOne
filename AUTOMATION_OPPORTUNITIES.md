# AUTOMATION_OPPORTUNITIES.md — Phase FOUNDER-WEEK-AUDIT-001

Every place this week's review found where a founder using the product daily would naturally expect the app to already be doing the work, rather than requiring a manual check. Each is grounded in something actually observed live this session, not speculative.

---

## 1. "What changed since I last looked" is a proven pattern the product already has — and doesn't use everywhere

Themes' expanded detail view already computes a real "Theme Evolution: what's new" comparison (e.g., "Unchanged: confidence 73 → 73 (+0)"). This is genuinely good, real, per-theme change detection. But it's **only visible after clicking into a theme** — the grid of 7 cards shows nothing but a name, so the founder has no way to know which of the 7 actually changed without opening all of them. **The fix that would remove measurable friction:** surface a one-line "what's new" (or a simple "no change since your last visit" / "1 new signal" badge) directly on each closed card, using data the theme-detail view already computes — no new backend logic, just moving an existing computed value up one level in the UI.

## 2. Recommendations run on a schedule the founder can't see the effect of without visiting

The Recommendations screen's own "Engine Status" panel discloses a real fixed interval ("Interval: 30 min," "Last run: 8/2/2026, 8:30:05 AM"). The engine is already running autonomously in the background. But nothing outside that one screen reflects this — the sidebar, Home, and header give no indication that new recommendations exist since the founder's last visit. **A founder doing a daily routine would expect a badge/count (matching the existing pattern already used for alerts — "Open alerts (2 unread)" already exists in the header) on Recommendations too**, rather than having to open the screen "just in case" every day.

## 3. Daily Feed and Alerts repeat the same event without connecting them

"Fed rate hike" appeared, word-for-word identically explained, on both Daily Feed and Alerts this session. A founder reading both screens in the same daily routine is doing the platform's own deduplication work by noticing "wait, didn't I just read this?" **A founder would naturally expect either**: (a) an event appearing on Alerts to be cross-referenced/linked from its Daily Feed appearance rather than independently duplicated, or (b) Alerts to only surface items that specifically crossed a real threshold *beyond* what Daily Feed already showed, with a visible reason why it escalated. Today, neither exists — the two screens read as two independent feeds that happen to draw from the same events.

## 4. Watchlist has an obvious "just start me anywhere" gap

A founder without an active invite code hits a dead end on "Workspaces" (Watchlist Folders) but a working empty state on "Watchlist Workspace." **A founder would naturally expect to just start adding tickers to a watchlist immediately upon opening the app**, the same way Portfolio and Recommendations already work without requiring any extra identity step. The gating exists for a real reason (per-user isolation, confirmed in this engagement's own history), but from a pure daily-workflow perspective, this is the one place automation (or at least a same-screen fallback that doesn't require guessing a second nav destination) is conspicuously missing relative to the rest of the app's behavior.

## 5. Reading depth isn't remembered

Every Recommendations card has a "Show full evidence" toggle; AI Analysis' sections are similarly collapsible/expandable in places. A founder who reads full reasoning every single day (which the "Decision confidence" evaluation in `FOUNDER_WEEK_REVIEW.md` suggests is exactly what's needed here, given the templating concerns) has to re-click the same toggle every day, on every card, indefinitely. **A founder would naturally expect a "always expand" preference** — a small, low-risk, high-frequency-benefit automation, especially relevant here since the whole point of reading the expanded view is to counter-check trust, which this review found is exactly where it's most needed.

## 6. Flagship and 3D Workspace could plausibly be one navigation decision instead of two

Confirmed this session: both screens share the identical shell component with only a single toolbar button's label differing ("Mission Chain" vs. "Mission Control"). A founder navigating the sidebar has to remember which of the two is "the one with the thing I want" rather than the platform automatically routing to the more relevant one (or presenting one entry with the two views as an in-screen toggle, which is a consolidation, not a new feature — see the explicit caveat in `NEXT_20_IMPROVEMENTS.md` about this only being proposed because it removes a real, observed navigation-choice friction, not because "fewer screens" is a goal on its own).

## 7. The morning routine already has the right shape in one place — it should be the template, not the exception

Home's very first block (3-bullet brief + "Action needed" banner + 2 CTAs) is the single lowest-friction, highest-clarity moment in the whole product. Every other workflow reviewed this week could be measured against "does it start with this same shape" — a one-glance answer before any scrolling or clicking — and most (AI Analysis' 9 sections, Themes' click-per-card grid, Recommendations' otherwise-strong cards undermined by templated reasoning) don't yet reach it. This is not a call for a redesign; it's an observation that the product has already built and shipped the right pattern once, and the fastest way to remove friction elsewhere is to extend that specific, already-proven shape rather than invent a new one.
