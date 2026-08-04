# FOUNDER_GO_NO_GO.md — Phase FOUNDER-PILOT-001

**Status: TEMPLATE — NOT YET FILLED.** This document defines how the end-of-week decision will be made; it does not contain a real result, because the seven-day pilot described in `SEVEN_DAY_USAGE_SCRIPT.md` has not yet been run as of this writing. Per this engagement's own standing discipline (see `SPRINT_33_MOBILE_EXECUTIVE_GATE.md`'s original "PENDING" pattern), a verdict is never fabricated ahead of the real observations it depends on. Complete §4-§6 honestly at the actual end of the actual week, using only what was actually logged in `REAL_DEVICE_FEEDBACK_TEMPLATE.md`.

---

## 1. Purpose

A single, objective gate at the end of the seven-day founder-only pilot, deciding whether ImpactOne is ready to move from "founder's own phone" to the next real audience (a small external beta cohort), stays in founder-only use for another cycle, or needs specific, named fixes first. This gate does not evaluate feature completeness or roadmap ambition — only what was actually observed during real daily use on a real device.

## 2. Launch-blocking criteria

Any **one** of the following, observed even once during the week, blocks a GO verdict outright — no averaging, no "it was probably a fluke," consistent with `BUG_SEVERITY_STANDARD.md`'s existing "any Critical finding blocks" rule and `IMPACTONE_RELEASE_GATES.md`'s "no exceptions to Blocking Issues" rule:

- **Any Critical finding** per `BUG_SEVERITY_STANDARD.md` (core promise blocked, a specific checkable false claim about the user's own data, or a destructive action with no confirmation).
- **Any trust-defect fail condition** per `MOBILE_TRUST_AUDIT.md`'s 10 checks, confirmed on the real device (not just previously known from a dev-server audit).
- **A crash, black screen, or complete loss of app state** at any point during the week, including after backgrounding during/after the Flagship/3D session.
- **Data loss or silent portfolio/watchlist corruption** — anything added (a watchlist ticker, a portfolio note) that didn't actually persist across a real app close/reopen.
- **An update that could not be applied cleanly** (update banner present but reload fails, hangs, or loses local state) — *only* if a real update was actually exercised this week; if none was deployed, this criterion does not apply (see §5).

## 3. Non-blocking but must be named (High/Medium findings)

Findings at High or Medium severity (`BUG_SEVERITY_STANDARD.md`) do not block a GO on their own, but every one found must be individually named in §6 below with its finding ID — a GO verdict issued while silently omitting a known High-severity finding is not a valid GO. This mirrors `IMPACTONE_DEFINITION_OF_DONE.md`'s "any known remaining gap is named explicitly, not omitted."

## 4. Coverage check (fill honestly at week's end)

For each of the 14 areas in `FOUNDER_PILOT_PLAN.md` §3, confirm at least one real observation was logged this week. If an area was accidentally never touched, that is itself a finding — the pilot's own coverage gap, not silently absorbed into "no issues found."

```
[ ] Morning market briefing
[ ] Portfolio review
[ ] Watchlist review
[ ] News intelligence
[ ] Recommendations
[ ] Alerts
[ ] AI Analysis
[ ] Flagship and 3D experience
[ ] Mobile portrait use
[ ] Mobile landscape use
[ ] Trust in data and explanations
[ ] Speed and friction
[ ] Battery and heat observations
[ ] Installation and update behavior

Any area not checked above — state why, and whether that alone should delay the verdict:
```

## 5. Findings tally (fill honestly at week's end)

```
Total findings logged across all 7 days: 
  Critical: ___   High: ___   Medium: ___   Low: ___

Every Critical finding (ID + one-line description + still-reproducible on re-check Y/N):


Every High finding (ID + one-line description):


Update behavior exercised this week? [ Yes / No — no new build deployed ]
If yes, result: 
```

## 6. Decision

Choose exactly one, based only on §2-§5 above:

```
[ ] GO — no Critical findings, no unresolved MOBILE_TRUST_AUDIT.md fail conditions,
    every High finding named and judged acceptable to carry into the next audience
    with a committed fix plan. Ready to move beyond founder-only use.

[ ] GO WITH NAMED FIXES REQUIRED FIRST — no Critical findings, but one or more
    High findings (or a coverage gap from §4) must be closed and re-verified live
    before moving beyond founder-only use. List the specific, minimum required
    fixes below — this is not a general backlog, only what actually blocks
    moving forward:
    1.
    2.

[ ] NO-GO — at least one Critical finding (§2) was observed. State which one(s),
    and whether the finding is still present as of the last day of the pilot
    (not just "it happened once on Day 2 and wasn't seen again" — re-check it
    explicitly before writing NO-GO or GO).
```

## 7. What happens next

- **GO:** proceed to designing the next-cohort beta plan (a separate, future phase — not performed here).
- **GO WITH NAMED FIXES REQUIRED FIRST:** the named fixes become their own explicitly-scoped phase(s). Once implemented, each fix must be **re-verified live against the exact original failing condition**, not assumed fixed from a diff or commit message — the same discipline this engagement has applied throughout its history. A second, shorter founder pilot on the fixed build is recommended before the next audience, rather than trusting the fix in isolation.
- **NO-GO:** the pilot itself continues in founder-only use (do not expand to any new audience) until the Critical finding(s) are resolved and independently re-confirmed absent over at least one further real day of use, not just a single retest.

## 8. Sign-off

```
Completed by: 
Date: 
Build/commit reference used during the pilot: 
Signature/confirmation that every field above reflects only what was actually observed, with nothing inferred or assumed: 
```
