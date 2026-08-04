# GO_NO_GO_ISOLATION.md

**Phase F2 — Isolation Design Review**
**Date:** 2026-07-23

---

## Final Verdict

# NO-GO

---

## Why

There is nothing to gate. A repo-wide check (`git log`, `git status`, and a full-text search for "isolation"/"multi-tenant"/"userId" across every markdown file) confirms **no Beta User Isolation architecture — design document or code — currently exists anywhere in this repository.** What exists is an accurate, well-documented diagnosis of the problem (this engagement's own `TOP_10_OPERATIONAL_RISKS.md` #1, plus three prior independent audits) but no proposed solution to approve, reject, or gate.

To make this review substantively useful rather than a one-line "nothing to see," `ISOLATION_REVIEW.md` evaluated the most likely *minimal* design implied by the repo's own already-written recommendations (nullable `userId` columns on `Portfolio`/`InvestorProfile`, a per-user invite token, no full auth system). That inferred design, even in its cheapest and most natural-to-build form, fails on at least three of the six required attack surfaces:

- **Data leakage (fails):** isolating storage without also isolating the recommendation-generation loop would leave all five users seeing recommendations computed from one shared portfolio — a worse, more systemic version of the exact false-personalization bug already found and fixed once in this product's history.
- **Migration risk (fails):** no decision exists for what happens to the existing shared Portfolio/Recommendation/Outcome history, and `DecisionTrace`'s immutability convention directly conflicts with any backfill approach.
- **Analytics contamination (unaddressed, not fails-but-unproven):** nothing prevents the natural temptation to merge the new beta-user identity into the deliberately anonymous analytics pipeline during implementation, silently reversing an existing, explicit privacy guarantee.

A NO-GO here is not a judgment that isolation is hard or a bad idea — it is the accurate statement that **there is currently no proposed design at all**, and the nearest inferable one is not yet safe for even five users.

---

## What Would Move This to a GO

1. A real, written design (even one page) naming: which tables get a `userId`, how the five tokens are issued and validated, and — critically — how the recommendation/DecisionTrace generation loop itself becomes per-user, not just storage.
2. An explicit decision on existing data: attach it to a named test/seed user, or discard it — stated as a deliberate choice, not left implicit.
3. A one-line, explicit non-goal statement that analytics and feedback identity are never merged with the new beta-user identity.
4. Confirmation that the five in-process caches (`finnhubCache`, `altDataCache`, `intelligenceCache`, plus the two inline AI-service caches) are re-keyed by user wherever they cache anything derived from a specific portfolio or profile.
5. A single, atomic find-or-create path for a new user's first Portfolio/InvestorProfile row (no separate find-then-create race).

None of the above requires new features beyond what's already implied by fixing the isolation gap itself — this is scoping and hardening a fix already named as necessary, not expanding the product.
