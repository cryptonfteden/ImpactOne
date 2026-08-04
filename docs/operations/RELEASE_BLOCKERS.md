# RELEASE_BLOCKERS.md

**Phase X6 — Release Candidate Audit**
**Rule followed:** only genuine blockers are listed. Cosmetic issues are explicitly excluded per this phase's own instruction.

---

### 1. The application does not start
`Header.jsx` imports `BETA_USER_LABEL_STORAGE_KEY` from `BetaInviteGate.jsx`, which does not export it. Every attempt to load the app this session — a fresh page, a hard reload, a brand-new browser context — produced a blank white screen with this exact error. Confirmed identically in the immediately preceding review session as well, meaning it has now persisted, unfixed, across two independent checks.

**Why it blocks:** nothing else can be evaluated, used, or trusted in a build that never renders. This is not a severity judgment among many findings — it is the absence of a product to release.

---

### 2. The health check cannot detect this (or any comparably severe) failure
`GET /health` returns a static `{"status":"ok"}` with no dependency or rendering check of any kind, confirmed directly this session while the frontend was completely broken.

**Why it blocks:** without this being fixed, there is no way to trust an "all clear" signal before inviting real users — the exact scenario that occurred today (backend reporting healthy, product completely unusable) is undetectable by the only health signal that currently exists.

---

## What Is Explicitly Not a Blocker

Per this phase's instruction to ignore cosmetic issues, none of the following (all previously documented in earlier review sessions, none re-verifiable today because the app doesn't load) are being carried forward as blockers: sidebar item count/consolidation, duplicate scoring surfaces, stale empty-state text, missing logout control, or any visual/layout finding. All of these matter for a later stage of polish, none of them are why this build should not ship today — the two items above are sufficient and necessary on their own.
