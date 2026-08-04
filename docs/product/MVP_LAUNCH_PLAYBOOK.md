# MVP Launch Playbook — ImpactOne

**Phase:** COMMERCIAL-READINESS-001. Companion to [COMMERCIAL_READINESS.md](../operations/COMMERCIAL_READINESS.md) and [USER_JOURNEY.md](USER_JOURNEY.md). Documentation only. Every recommendation below is ranked by business impact, not engineering effort — a cheap fix with high trust impact outranks an expensive fix with low impact.

---

## Priority 1 (Critical business impact) — fix before any paid launch messaging

1. **Fix the templated Daily Feed explanation defect.** This is the single highest-priority item in this entire playbook. It is not a monetization gap — it is a live, currently-shipping defect that actively damages the exact trust proposition a paying customer would be asked to pay for. Every other recommendation in this playbook is less urgent than this one, because a commercial launch built on top of a still-visible instance of this defect would be actively counterproductive — it would bring more attentive users (paying ones) directly to the evidence that undermines the pitch.
2. **Build a minimal real monetization surface.** At minimum: one pricing page (even a single-tier "beta pricing" page), one real Stripe (or equivalent) checkout integration, and a real plan-gate somewhere in the product. `API_CONTRACTS.md`'s already-specified endpoint shape (`GET /api/billing/plans`, `POST /api/billing/checkout`, `POST /api/billing/portal`) is a real, ready-to-implement starting design — this is not a from-scratch design exercise, it is implementation of an already-specified contract.
3. **Re-verify the genuinely-new-user journey.** Confirm what a brand-new, zero-history account actually experiences on first load — this was not re-tested this session and is a real, open gap in this review's own coverage that must be closed before any launch decision.

## Priority 2 (High business impact)

4. **Build a real landing/marketing page**, separate from the in-app experience — even a single, well-written page explaining the value proposition and trust story before a visitor enters the product.
5. **Fix the Notification Center's silent failure on a fresh Guest session** — replace the developer-facing console error with an honest, user-facing empty/unavailable state, matching the same discipline already applied consistently to Portfolio and Alerts.
6. **Design (not necessarily build immediately) a real trial mechanism** — a defined trial period or feature scope, with a clear, honest transition point to a paid plan.

## Priority 3 (Medium business impact)

7. **Add an upgrade prompt at a genuine moment of value realization** — e.g., after a user's first Recommendation proves directionally correct (once the now-real Outcome Calibration Engine has accumulated enough data to make such a claim honestly) — never as an interruption, and never before the platform can honestly back the claim being used to prompt the upgrade.
8. **Extend the onboarding modal's honesty pattern to a short in-product tour** of the 5 main navigation destinations, reusing the exact same plain-language, non-hyped tone already established.

## Priority 4 (Low business impact, but cheap and worth doing)

9. **Fix the Feedback widget's fixed-position overlap with the bottom-navigation Profile button** (confirmed live this session, at a narrow viewport — the Feedback button's click-target intercepts the Profile nav button's own click area) — a small, real, easily reproducible layout bug.

---

## What this playbook explicitly does not recommend

- **Building a full multi-tier pricing structure before validating willingness-to-pay** — this engagement's own prior `BETA_SUCCESS_REVIEW.md` (an earlier phase in this engagement) already identified willingness-to-pay as never having been directly asked of any real user — a minimal single-tier pricing page (Priority 1, item 2) is sufficient to start learning this; a full tiered structure is premature before that.
- **Delaying the templated-explanation fix behind the monetization build** — despite monetization being the larger engineering effort, the explanation fix is both cheaper and more urgent, since it protects the trust the monetization effort itself depends on.
- **Treating this playbook as a substitute for the platform's own existing engineering-focused launch planning** (`LAUNCH_ROADMAP.md`, `GO_LIVE_CRITERIA.md`, `LAUNCH_CHECKLIST.md`) — this playbook is a commercial/product-experience companion to that engineering-focused work, not a replacement for it; a real launch requires both tracks to close.

## Recommended sequencing relative to the platform's own existing launch planning

The engineering-focused `GO_LIVE_CRITERIA.md` (produced earlier this engagement) gates a *technical* launch. This playbook's Priority 1 items should be treated as an **additional, parallel gate specifically for any *commercial/paid* launch** — a platform can reasonably reach `GO_LIVE_CRITERIA.md`'s technical bar (a private, free beta) before this playbook's Priority 1 items are complete, but should not begin charging real users money until both gates are satisfied.
