# DECISION_CENTER_REVIEW.md

**Phase X3 — Institutional UX Red Team**
**Persona:** portfolio manager / hedge fund analyst, judging only the live product.
**Method:** live testing against the running product this session, including a full backend restart to rule out stale-process artifacts before judging functionality.

---

## What Exists

Decision Center is now a real, dedicated screen with its own sidebar nav item ("Command Center — Decision Center," heading "What decisions require your attention today?"). It's a genuinely good premise for a portfolio manager: a single feed combining triggered price alerts and new/graded AI recommendations, filterable by source (Price Alert / AI Recommendation) and priority (High/Medium/Low) — exactly the kind of consolidated, action-oriented view an institutional user expects instead of checking five separate screens.

## What Was Found Live

**First pass (stale backend process):** the screen's data request 404'd outright — the route didn't exist in the process actually serving requests, even though it existed in source. Restarting the backend resolved this, which is itself worth noting: the review only produced an accurate result after ruling out a stale running process, a genuine risk for anyone evaluating this product without checking process freshness first.

**Second pass (fresh backend):** the request now fails with a 400 — "A beta user identity is required for the Decision Center." This is architecturally sound (matches the isolation work reviewed in prior sessions) but functionally blocking: **there is no user-facing way to obtain a beta user identity anywhere in the product.** No invite-code field was found in onboarding, Settings, or the account menu. A real user — even the 2 people this beta is scoped for — would hit this exact wall on their first visit to Decision Center, with no path forward.

**A repeated, real defect found in both passes:** the screen simultaneously displays an error message ("Request failed..." or "A beta user identity is required...") **and** the empty-state message "No decisions need your attention right now" at the same time. These two messages contradict each other — one says the data couldn't be loaded, the other implies it loaded successfully and found nothing. A portfolio manager reading this would reasonably wonder whether the screen is broken or genuinely has nothing to show, and the UI currently cannot tell them which is true.

## Judged as a Portfolio Manager

The concept is right — decision fatigue reduction is a real, valuable premise, and combining alerts with recommendations into one prioritized feed is a legitimate professional-workflow idea, not a gimmick. But a screen that cannot currently be reached by any real user (due to the missing identity-provisioning step) and that shows contradictory error/empty states when it does fail cannot be judged as reducing decision fatigue today — it has not yet been usable long enough to evaluate that question honestly.

## Severity

**Critical** — not because the idea is flawed, but because the feature is currently unreachable by any real user given the current onboarding flow, and its error handling actively misleads about why.
