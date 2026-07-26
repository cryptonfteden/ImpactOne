# H3_UX_REVIEW.md

**Phase H3 — UX and Alerts Red Team**
**Date:** 2026-07-23
**Persona:** a demanding premium fintech user, evaluating whether this is fit for a 2-user private beta.
**Method:** live testing only, against the actually running product (backend :5000, frontend :5174), not design documents. Every finding below was personally reproduced this session — desktop (1280×720, 1440×900), mobile portrait (390×844), and phone landscape (844×390) were all tested directly.

---

## First Impression

A short branded loading spinner, then a one-time "A few things worth knowing before you dive in" modal (recommendations may start empty, portfolio is simulated, everything is advisory-only), then a dense but organized "Your morning brief" home screen. This is a genuinely strong opening sequence — a first-time user is told what to expect before they can be confused by it.

## Visual Quality

Clean dark theme, consistent card system, a deliberate "Terminal" aesthetic (geometric glyph icons — ◈ ◉ ▲ ◑ — instead of generic emoji icon sets, a real "$X,XXX.XX / ±$X,XXX.XX" ticker readout in the header). At normal desktop width (1440×900) this reads as considered and premium, not templated.

## Futuristic Feel

The "ImpactOne Terminal — Live intelligence workspace" framing, the glyph iconography, and the "Intelligence Timeline" (Overnight / Opening Bell / Today / This Week / Long Term) navigation genuinely evoke a professional trading-terminal feel rather than a generic consumer finance app. This is a real, earned positive — most retail fintech products default to a much softer, more consumer-app visual language, and this one deliberately doesn't.

## Navigation Clarity

Desktop sidebar carries 11 top-level items; mobile portrait collapses sensibly to a 5-item bottom nav (Home / Feed / Portfolio / For you / Profile). This works well in both of those specific configurations.

**Finding — High:** at phone-landscape orientation (tested directly at 844×390), the app reverts entirely to the 11-item desktop sidebar instead of the mobile bottom nav, confirmed via direct visibility check (sidebar `isVisible()=true`, bottom nav `isVisible()=false`). For a demanding user who ever rotates their phone, this is a jarring, cramped regression to a completely different navigation paradigm mid-session.

## Information Hierarchy

At 1440×900, hierarchy is clear: page title → primary metric → supporting detail, with color used purposefully (a blue accent, muted secondary text, colored risk/status pills).

**Finding — Critical:** at a narrower desktop width (tested directly at 1280×720), the header's bounding box measures 340px tall — nearly half the visible viewport — because the search bar, market-status pill, and icon buttons stack vertically instead of staying in one row. This is not just cosmetic: it was directly confirmed to **push the Portfolio screen's "Place Order" button to the same on-screen coordinates as the header**, making the button physically unclickable at this width until the browser is widened. A demanding user on a laptop at this common resolution cannot place a paper trade at all.

## Mobile Usability

Mobile portrait (390×844) behaves correctly — clean bottom nav, no header-overlap issue, account menu interactions don't block other clicks at this width.

**Finding — Medium:** the account-menu dropdown ("Guest workspace / Settings") does not close on outside click or on navigating to another screen — confirmed directly: after opening the menu and clicking a different nav item, the menu's own contents (a second "Settings" button) were still present in the page afterward. It only closes if its own toggle button is clicked again. Not blocking at mobile widths, but sloppy for a "premium" bar, and it compounds the Critical header-overlap finding above at in-between (narrow-desktop) widths, where the still-open menu was directly observed intercepting clicks meant for content elsewhere on the page.

## Recommendation Readability

Recommendation cards are well-structured (action, confidence, risk, size guidance, a "Why now," a falsifiable "Would prove it wrong" condition) and consistently formatted. This remains one of the product's strongest surfaces.

## Portfolio Readability

Clear, correctly labeled as simulated paper trading, with a real open-positions table, sector allocation, and trade history. Numbers cross-check consistently against each other (e.g., the same Technology-sector concentration percentage appears correctly everywhere it's referenced).

**Finding — High, first-impression-specific:** a freshly opened browser (a genuine new context, not a returning session) lands directly on a Portfolio screen that **already has 5 open positions and real trade history from prior activity** — not an empty starting portfolio. For "the first real beta user" or a genuine second beta user, this means their very first look at "their" portfolio shows trades they never made. This is a direct, live-observed instance of the cross-user data isolation gap this engagement has flagged in prior phases, now confirmed specifically from the angle of a brand-new user's first impression.

## Watchlist Folders

**Finding — Critical (scope gap, not a quality defect):** no folder concept exists anywhere in the shipped Watchlist screen. It is a single flat list ("Add ticker," "Tracked tickers: N") with no way to create, name, or assign a ticker to any grouping. Full findings in `WATCHLIST_ALERT_RED_TEAM.md`.

**Finding — Medium:** after successfully adding a ticker (confirmed: AAPL added, a real populated card rendered showing live price/AI rating/move %), the watchlist's own empty-state text ("No watchlist symbols yet. Add tickers to generate premium watch intelligence.") remained visible directly alongside the real, populated card — a genuine, reproducible inconsistency a demanding user would notice immediately.

## Price-Alert Creation

**Finding — Critical (scope gap, not a quality defect):** no price-alert creation UI exists anywhere in the product — not on Watchlist, not on the Alerts screen, not in the header's "Quick actions" or bell-icon menus (both checked directly; both only contain navigation shortcuts to existing screens). The Alerts screen is a read-only "thresholded intelligence feed" with no user-created alert of any kind. Full findings in `WATCHLIST_ALERT_RED_TEAM.md`.

## Triggered Notifications

Not testable — there is no mechanism to create a notification-worthy alert in the first place (see above). No in-app notification/toast system was observed being triggered by any action taken during this session.

## User Isolation

**Finding — Critical, carried forward and re-confirmed live this session:** the account menu offers no sign-up, login, or account-switching option of any kind — only a static "Guest workspace" label and a Settings shortcut. Combined with the pre-populated shared portfolio finding above, this directly confirms (via fresh, live observation, not just prior architectural review) that a 2-user beta today would mean both users sharing one identity, one portfolio, and one set of data with no separation.

---

## Summary Table

| Area | Severity | Blocks 2-user beta? |
|---|---|---|
| Narrow-desktop header overlap makes Place Order unclickable | Critical | Yes |
| No user isolation — shared account/portfolio confirmed live | Critical | Yes |
| Watchlist folders — feature does not exist | Critical (scope gap) | Yes, for the scope as defined |
| Price-alert creation — feature does not exist | Critical (scope gap) | Yes, for the scope as defined |
| Phone-landscape reverts to desktop sidebar | High | No, if landscape isn't the primary use case |
| Fresh account shows pre-existing portfolio/trades | High | No on its own; compounds the isolation finding |
| Watchlist empty-state text persists after real data loads | Medium | No |
| Account menu doesn't close on outside click/navigation | Medium | No |
