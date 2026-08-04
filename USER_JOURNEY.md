# User Journey — ImpactOne

**Phase:** COMMERCIAL-READINESS-001. Companion to [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md). Documentation only. Maps the real, live-observed journey today against the journey a genuine commercial launch would require.

---

## The journey today (live-observed this session)

1. **Arrival**: a visitor lands directly in the application (`http://127.0.0.1:5174/` in this dev environment) — no marketing page, no explanation of what ImpactOne is before entering the product itself.
2. **First modal**: a real, honest "Welcome to the Beta" overlay — 3 plain-language trust disclosures (empty recommendations are normal, portfolio is simulated, everything is advisory-only).
3. **Home screen**: immediately populated with a full "morning brief" — a real, if not-yet-brand-new, simulated portfolio (5 positions, real P&L math), a ranked recommendation list, and a Daily Feed preview.
4. **Exploration**: 5 primary navigation destinations (Home / Feed / Portfolio / For You / Profile) plus a Feedback widget and header shortcuts (alerts/notifications/quick actions/account menu).
5. **No monetization touchpoint exists anywhere in this journey** — a user can use every feature indefinitely with no prompt, gate, or plan distinction of any kind.

## Where this journey breaks down for a genuine first-time (brand-new, empty) user

This session's own live test used the default "Guest workspace" state, which (per this engagement's own extensive prior history) already carries a populated shared/demo-like portfolio state rather than a genuinely blank slate. **The specific experience of a brand-new user with zero history was not re-verified this session** — this is a real, open gap in this review's own coverage, not a claim that the journey is broken, and should be the first thing verified before any commercial-readiness sign-off.

## The trust-critical moment: Daily Feed

Live-confirmed this session: within the first few items a genuinely attentive user scrolls past, two unrelated headlines share word-for-word identical explanation text and identical scores. **This is the single highest-leverage moment in the entire journey to fix** — it occurs early, it is easily noticed, and it directly contradicts the "genuinely reasoned, not templated" value proposition the rest of the product's copy (the onboarding modal, the advisory-only disclosures) works hard to establish.

## The journey a genuine commercial launch requires (does not exist today)

1. **A real landing/marketing page** — explaining the value proposition, target user, and trust story *before* asking for a signup, distinct from the in-app experience.
2. **A real signup/plan-selection moment** — today's "Guest workspace" pattern has no equivalent decision point; a commercial product needs one.
3. **A real trial mechanism** — a defined, time-boxed or feature-boxed trial period with a clear transition to a paid plan.
4. **A real upgrade prompt somewhere in the product** — surfaced at a moment of genuine value realization (e.g., after a user's first real recommendation proves useful), not as an interruption.
5. **A real billing/subscription-management surface** — even a minimal one, reusing `API_CONTRACTS.md`'s already-specified (if unimplemented) endpoint shape.

## Journey comparison table

| Stage | Exists today? | Quality (if it exists) |
|---|---|---|
| Marketing/landing page | No | N/A |
| Signup/plan selection | No (goes straight to "Guest workspace") | N/A |
| First-run trust disclosure | Yes | Genuinely strong |
| First-run empty/populated state for a truly new user | Not re-verified this session | Unknown — flagged for immediate re-test |
| Daily value delivery (Morning Brief/Feed) | Yes | Undermined by the templated-explanation defect |
| Portfolio experience | Yes | Genuinely strong, honest |
| Alerts | Yes | Functional, honestly empty when unused |
| Trial | No | N/A |
| Upgrade prompt | No | N/A |
| Billing/subscription management | No | N/A |
| Retention loop (daily return reason) | Yes, in concept | Undermined by the same templated-explanation defect |
