# Identity Flow Audit — Phase X8, Part 1

## The bug, precisely

`investorProfileRepository.findDefaultInvestorProfile(betaUserId)` decided the onboarding gate (`AppRoot.jsx`'s `hasProfile`). Before this phase, when no `betaUserId` was available — a brand-new browser that hasn't resolved a beta identity yet — the query was:

```js
return prisma.investorProfile.findFirst({ orderBy: { createdAt: "asc" } });
```

No `where` clause at all. This returns **the very first `InvestorProfile` row ever created, by anyone** — the founder, a beta user, a test run. A brand-new browser with zero localStorage and zero resolved identity would silently inherit that profile's `hasProfile: true`, and `AppRoot.jsx` would skip both the beta invite gate and onboarding entirely, landing the new user straight in the main app as if they were a returning user. This was reproduced live in Phase X7-RC's certification (a fresh Playwright context landed past onboarding) and is the direct root cause this phase's mission names.

## Why this is a "global state" bug, specifically

The decision "has this session/user completed onboarding" was being answered by a query with no session-scoping dimension at all — it answered "does *any* onboarding exist in the whole system," which is a fundamentally different (and, for a multi-user beta, wrong) question.

## The fix

```js
async function findDefaultInvestorProfile(betaUserId) {
  const prisma = getPrismaClient();
  if (betaUserId) {
    return prisma.investorProfile.findFirst({ where: { betaUserId } });
  }
  return prisma.investorProfile.findFirst({ where: { betaUserId: null }, orderBy: { createdAt: "asc" } });
}
```

Two real, distinct cases, both now correctly scoped:

1. **A resolved beta identity** (`betaUserId` present) — matches only that identity's own real profile. Already correct before this phase; unchanged.
2. **No resolved identity** — matches only a profile that was *itself* created with no identity (a genuine legacy/solo-dev/skipped-beta-gate profile, which `createInvestorProfile` stores with `betaUserId: null`). A real beta user's profile (always created with a real, non-null `betaUserId`) can **never** match this branch, under any circumstance — eliminating the cross-user leak structurally, not by convention.

## The decision flow, documented

```
Browser loads app
  │
  ├─ useBetaIdentity() resolves: CHECKING → (URL invite code? / stored identity?) → READY | NEEDS_CODE | EXPIRED | INVALID
  │
  ├─ IDENTITY_STATUS.READY (a real, resolved betaUserId)
  │     └─ useInvestorProfile() queries WITH that real betaUserId
  │           └─ hasProfile reflects ONLY this identity's own onboarding state — real per-user isolation
  │
  ├─ IDENTITY_STATUS.NEEDS_CODE, user has not yet chosen
  │     └─ BetaInviteGate shown — real invite resolution, or an explicit "Skip"
  │
  └─ IDENTITY_STATUS.NEEDS_CODE, user explicitly skipped (betaGateDone, no identity resolved)
        └─ useInvestorProfile() queries WITH NO betaUserId
              └─ hasProfile now reflects ONLY a genuine no-identity profile (betaUserId: null in the DB)
                    — never a real beta user's profile, by construction of the fixed query above
```

## Requirements, verified against the real fix

| Requirement | How it's satisfied |
|---|---|
| Onboarding decisions must be session-based, never global | The query is now always scoped — either to a real `betaUserId`, or explicitly to `betaUserId: null` — never unscoped. |
| A brand-new browser must always follow the correct onboarding path | A brand-new browser with no identity and no prior local skip-created profile gets `hasProfile: null` → `false` on 404, reaching onboarding. Verified by a new backend test (`investorProfileService.test.js`: "a real beta user's profile never leaks into a session with no resolved identity"). |
| Returning users must never be asked to onboard again | Unaffected by this fix — a returning user with a real, resolved `betaUserId` always matched their own profile correctly, before and after. Verified live (`RELEASE_CERTIFICATION.md`'s returning-session flow) and by the full backend suite. |
| Multiple beta users must remain isolated | Verified by a new backend test ("multiple real beta users' profiles are fully isolated from each other") — two real beta users, two real profiles, confirmed each only sees their own. |

## One remaining, disclosed edge case

If the founder (or any tester) uses the "Skip" button during development, a genuine `betaUserId: null` profile is created — this is real, intentional backward compatibility for a single-tenant/local-dev deployment (predates the beta system). In the *specific* operational context of the real 2-user private beta, this means: **a browser that also ends up with no resolved identity (e.g., its own invite code fails to resolve, or it's also skipped) will see that skip-created profile**, not a blank onboarding. This is a real, narrow scenario, structurally different from the fixed bug (it requires the *same* no-identity code path to be hit twice, not one real beta user's identity leaking to another) — recorded here rather than silently left undocumented. Operational mitigation: avoid using "Skip" on any browser that could be mistaken for a real beta user's session during the live beta window.

## Testing

- `investorProfileService.test.js` — 2 new tests (cross-user leak prevention, multi-user isolation), 1 new test confirming the legacy no-identity path still works (backward compatibility). All 15 tests in this file pass.
- Full backend suite and live browser verification: see `PRODUCTION_VALIDATION.md` and `PRIVATE_BETA_CERTIFICATION.md`.
