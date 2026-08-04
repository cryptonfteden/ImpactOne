# Analytics Event Map — Phase F1

Design/documentation only. Section 1 documents what's real and already flowing today; Section 2 proposes additions for beta operations specifically (no AI/recommendation-quality events — out of scope this phase).

## 1. Existing Events (already implemented, verified via code — not proposed)

All flow through `frontend/src/utils/analytics.js`'s `trackEvent(eventName, properties)` → `POST /api/v2/analytics/event`, allowlisted on both client and server, tagged with a per-browser `sessionId` (localStorage `impactone-session-id`), no PII.

| Event | Fired from | Purpose |
|---|---|---|
| `first_open` | `main.jsx` | App boot, first-ever load signal |
| `onboarding_completed` | `OnboardingFlow.jsx` | Real funnel completion |
| `onboarding_step_completed` | `OnboardingFlow.jsx` | Per-step funnel detail |
| `onboarding_step_skipped` | `OnboardingFlow.jsx` | Which optional steps get skipped |
| `returning_user` | `useInvestorProfile.js` | Distinguishes new vs. returning sessions |
| `recommendation_viewed` | `RecommendationCard.jsx` | Engagement with a specific recommendation |
| `recommendation_expanded` | `RecommendationCard.jsx` | Deeper engagement (full reasoning opened) |
| `recommendation_understood` | `RecommendationCard.jsx` | Explicit positive comprehension signal |
| `feedback_submitted` | `RecommendationCard.jsx` | Per-recommendation feedback (incl. `DONT_UNDERSTAND`) |
| `morning_brief_read` | `HomeScreen.jsx` | Daily-habit signal |
| `first_useful_information` | `HomeScreen.jsx` | Time-to-value milestone, with real `durationMs` |
| `first_recommendation_rendered` | `RecommendationsScreen.jsx` | Time-to-value milestone, with real `durationMs` |
| `search_conversational_used` | `Header.jsx` | Feature-discovery signal |

**Assessment:** this is a genuinely solid foundation — real funnel events, real TTV timing, no PII, already server-validated. Phase F1 does not need to rebuild any of this.

## 2. Proposed Additions for Beta Operations (design only, not implemented)

Scoped strictly to operating the beta — no new AI/recommendation-quality signal, consistent with this phase's constraints.

| Event | Fired from (proposed) | Purpose | Properties |
|---|---|---|---|
| `beta_cohort_identified` | Onboarding, once | Attaches the invite-code/referral field (§1 of `BETA_OPERATIONS_PLAN.md`) to the session, de-anonymizing the existing `sessionId` for a 5-person cohort without building auth | `{cohortCode}` |
| `error_reported` | New error-reporting path in `errorHandling.js` (§5 of the operations plan) | Lets the founder see error *volume* trending in the same event stream already used for everything else, not just the raw error table | `{errorType, componentName}` (no message/stack — that's in the dedicated error payload, not analytics) |
| `general_feedback_submitted` | New product-wide feedback channel, if it ever becomes in-app (currently designed as an external form/email per §2 of the operations plan) | Distinct from the existing per-recommendation `feedback_submitted` — tracks that the *general* channel was used at all | `{channel}` |
| `version_viewed` | Settings screen, if the version string (§3 of the operations plan) is added | Lets the founder confirm which beta users are on which build during troubleshooting | `{version, commit}` |
| `beta_day1_checklist_completed` | The proposed Day-1 checklist overlay (§1 of the operations plan) | Confirms the seeded first-session guidance is actually being used, not just shown | `{stepsCompleted}` |

## 3. What's Deliberately Not Proposed

- No recommendation-quality or AI-confidence events (`recommendation_understood` already exists and is sufficient; anything deeper is Phase D/AI-quality territory, out of scope here).
- No device/hardware fingerprinting beyond the existing anonymous `sessionId` — disproportionate for 5 known users.
- No third-party analytics SDK (Segment, Amplitude, etc.) — the existing custom pipeline is small, real, and already working; adding a vendor for 5 users is not justified.

## 4. Backend Note (for whoever implements this later)

The existing `backend/services/analyticsService.js` allowlist must be extended to include any new event names from §2 before they'd actually be accepted — the server independently validates, so simply emitting a new client-side event name does nothing until the backend allowlist is updated too. This is a one-line-per-event addition when implementation is explicitly requested; not done in this phase.
