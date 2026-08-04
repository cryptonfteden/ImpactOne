# H3_VERDICT.md

**Phase H3 — UX and Alerts Red Team**
**Date:** 2026-07-23

---

## Final Verdict

# BLOCKED

---

## Why

This is not a verdict about the quality of what has been built — the parts of ImpactOne that exist today (Home, Recommendations, Portfolio, the overall visual and navigational design) are genuinely well above the bar for an early beta, and a demanding fintech user would notice and credit that. This is a verdict about scope: **the two named features this review's entire "attempt to break" list is built around — watchlist folders and price-alert creation — do not exist anywhere in the current product.** Nine specific break-attempts were requested; seven of them had nothing to test against. A beta framed around these features cannot proceed today because there is nothing there yet to put in front of two real users.

Independent of that scope gap, two additional findings would each independently justify BLOCKED on their own:

1. **Cross-user data isolation is confirmed absent, live, not just architecturally.** A genuinely fresh browser session this session landed directly on a portfolio with five pre-existing positions and real trade history — not a clean start. There is no login or account-switching mechanism anywhere. Two real people using this beta in the same window will see and be able to change the same shared data.
2. **A real, reproducible interaction bug blocks a core action at a common desktop width.** At 1280×720, the header's own layout grows tall enough to sit on top of the Portfolio screen's "Place Order" button, making it physically unclickable until the window is widened — confirmed directly, not inferred.

---

## What Would Move This to READY FOR 2-USER BETA

1. Either build the minimal version of watchlist folders and price alerts this review was scoped to test, or explicitly descope them from what the two beta users are told to expect and re-run this review against the narrower, honest scope of what actually exists (Home, Recommendations, Portfolio, Watchlist, Alerts-as-read-only-feed).
2. Give the two users separate, real data — even the smallest possible fix (two fixed, pre-provisioned identities with separate portfolios) closes the most serious finding in this review.
3. Fix the narrow-desktop header/content overlap so no core action becomes unclickable at a common screen width.

None of the above requires new AI/recommendation-logic work — all three are either a scope decision or a presentation-layer fix.

---

## What Should Not Block Launch

Per this review's own instruction that cosmetic issues must not block the beta unless they materially damage trust or usability — the following were found and are explicitly **not** treated as blockers: the watchlist's stale empty-state text persisting next to real data (Medium — a visible rough edge, not a trust or functionality problem), the account menu not closing on outside click (Medium — annoying, not blocking at the widths where two real users would most likely use the product), and the phone-landscape navigation regression (High but not Critical — real, but avoidable by using the product in portrait, which is how a financial app is overwhelmingly used on mobile).
