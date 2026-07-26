# WATCHLIST_ALERT_RED_TEAM.md

**Phase H3 — UX and Alerts Red Team**
**Date:** 2026-07-23
**Method:** live attempts against the running product only. Every item below was actually attempted in the browser this session — none are inferred from documentation.

---

## The Headline Finding, Before Anything Else

Before attempting to break any of the nine named behaviors, I checked whether the features they target exist at all. **Watchlist folders and user-created price alerts do not exist anywhere in the current build.** Confirmed directly by:
- Opening the Watchlist screen: a flat "Add ticker" input and list, no folder/grouping control anywhere.
- Opening the Alerts screen: a read-only "Active alerts — Thresholded intelligence feed" panel showing only system-generated items, with no "create alert," no target-price field, no per-symbol alert control.
- Opening both header shortcuts (the 🔔 bell and the ⚡ "Quick actions" menu): both contain only navigation links to existing screens (Open Home / Open Portfolio / Open Alerts) — no alert-creation entry point in either.

Every item below is therefore reported as **NOT TESTABLE — feature does not exist**, except where a closely related, actually-existing behavior could be tested instead (duplicate-ticker handling on the flat watchlist).

---

## 1. Folder Creation and Deletion
**Not testable — no folder concept exists.** There is nothing to create or delete. This is the single largest gap relative to this review's named scope: the entire premise of "watchlist folders" as a feature is absent from the shipped product.
**Classification: Critical** (as a scope gap — the beta as defined by this mission cannot exercise this area at all).

## 2. Moving Stocks Between Folders
**Not testable — no folders exist to move a stock between.**
**Classification: Critical** (same underlying gap as #1).

## 3. Duplicate Stocks
**Testable, and actually attempted.** Added "AAPL" to the watchlist, then submitted "AAPL" again immediately after. Result: the tracked-ticker count stayed at exactly 1 — the product correctly rejects/deduplicates a repeated symbol rather than creating two entries for the same ticker.
**Classification: Pass, no issue found.** This is a genuine positive: the one piece of "duplicate" handling that could be tested behaves correctly.

## 4. Invalid Target Prices
**Not testable — there is no target-price input anywhere**, because there is no alert-creation UI at all. There is nothing to enter an invalid value into.
**Classification: Critical** (scope gap).

## 5. Multiple Alerts on One Stock
**Not testable — same root cause.** No mechanism exists to create even one alert on a stock, let alone several.
**Classification: Critical** (scope gap).

## 6. Alert Trigger Behavior
**Not testable.** With no way to create a threshold-based alert, there is nothing whose trigger behavior could be observed or broken.
**Classification: Critical** (scope gap).

## 7. Alert History
**Not testable as "history of user-created alerts."** The Alerts screen does show a system-generated "Active alerts" feed (currently empty in this session's account — "No alert crossed confidence, impact, and exposure thresholds"), but this is a different concept from a history of alerts a user configured themselves, which doesn't exist.
**Classification: Critical** (scope gap).

## 8. Notification State
**Not testable in the sense of "did a triggered alert produce a notification."** No action taken this session (adding a ticker, viewing a recommendation, submitting garbage search input) produced any toast, badge, or push-style notification. The bell icon (🔔) is present in the header but functions only as a navigation shortcut to the Alerts screen, not as a notification indicator with a count or unread state.
**Classification: Medium** (an honest absence, not a broken promise — the bell doesn't claim to show a count it doesn't have).

## 9. Cross-User Access
**Testable, and directly confirmed as a real, live problem — not a hypothetical.** A genuinely fresh browser session (new context, no prior cookies/localStorage) was opened this session and, after the one-time welcome modal, landed directly on a Portfolio screen showing 5 already-open positions and real trade history from prior activity — not an empty starting portfolio. There is no login, signup, or account-switching control anywhere (the account menu shows only a static "Guest workspace" label). This confirms, via direct live observation rather than architectural inference, that two real beta users today would see and be able to modify the exact same shared account, portfolio, and data.
**Classification: Critical.**

---

## What This Means for a 2-User Beta Specifically

With exactly two users, cross-user access (#9) is not a statistical risk to be monitored — it is a certainty that will occur the first time both people use the product in the same window. There is no folder or alert feature for either user to use, break, or give feedback on, because none exists yet. Any beta invitation framed around "try our new watchlist folders and price alerts" would be inviting two real people to test a feature that isn't in the product they'll actually open.
