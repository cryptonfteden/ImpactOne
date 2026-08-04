# WORKSPACE_V2_REVIEW.md

**Phase X3 — Institutional UX Red Team**
**Persona:** professional swing trader, judging only the live product.

---

## What Exists

There is no screen or component literally named "Workspace V2." The closest, and almost certainly the intended, real equivalent is the new **Watchlist Folders** screen ("Command Center — Watchlists," heading "Watchlist Folders & Price Alerts"), confirmed live this session as a genuinely new addition since the last review pass (it did not exist during Phase H3's testing of this same product).

## What Was Found Live

The screen's premise is strong and specifically well-aimed at the "investment project, not a watchlist" question this review asks: the placeholder folder suggestions shown directly in the UI — **"AI, Long Term, Waiting for Entry, Space and Defense"** — are thesis-oriented, not just alphabetical or sector-based groupings. That is a real, deliberate design choice toward feeling like an analyst's working thesis structure rather than a flat ticker list, and it's the right instinct for this persona.

**Blocked from full testing:** the same missing beta-user-identity gap found in `DECISION_CENTER_REVIEW.md` blocks this screen too — "A beta user identity is required for watchlist folders" appears immediately, and folder creation, symbol-to-folder assignment, and price-alert creation could not be exercised as a real, identified user this session. The screen visually renders its empty states correctly regardless (a real "Create a folder" input, an honest "No folders yet" message, an honest "No price alerts yet" message) — these did not error out the way Decision Center's did, which is a point in this screen's favor.

## Judged Against "Does Workspace Feel Like an Investment Project Instead of a Watchlist?"

On the strength of the folder-naming premise alone: yes, directionally — a swing trader thinking in terms of "Waiting for Entry" versus "Long Term" is a genuinely different mental model than a flat symbol list, and the product is clearly aiming at that distinction deliberately. This cannot yet be confirmed as *achieved* in practice, since the core interactions (create a folder, move a stock into it, set a real alert) could not be completed this session due to the identity gap.

## Cross-Cutting Finding: The Identity Gap Affects Every New Feature This Session

Decision Center, Watchlist Folders, and Notifications all independently failed with the same "beta user identity required" message, and no path exists anywhere in the current onboarding flow to obtain one. This is not three separate bugs — it is one integration gap (a backend identity requirement shipped ahead of any frontend way to satisfy it) affecting every new feature reviewed this session equally.

## Severity

**High** — the underlying design instinct is sound and worth preserving, but the feature cannot be evaluated as delivering on its premise until the identity-provisioning gap is closed, since every meaningful interaction on this screen depends on it.
