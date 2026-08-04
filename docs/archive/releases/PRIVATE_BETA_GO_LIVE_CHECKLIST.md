# Private Beta Go-Live Checklist
## Office of the Chief Beta Director — ImpactOne

**Rule:** every item below is measurable — a number, a count, a pass/fail test, or a yes/no confirmation. No item is satisfied by a judgment call or an opinion. If an item cannot currently be measured, it is not checked, regardless of how confident anyone feels about it. The beta does not begin until every item in Section A is checked; Sections B–D must be checked before the first invite is sent.

---

## Section A — Product Readiness (directly gated on `BETA_READINESS_AUDIT.md`'s Critical findings)

- [ ] **A1.** The Home screen's main content is visible and interactive within 2 seconds of load, verified across 10 consecutive fresh page loads with 0 failures.
- [ ] **A2.** The same test (A1) is repeated after a full page reload, 10 consecutive times, with 0 failures.
- [ ] **A3.** A test account with zero portfolio positions and zero watchlist entries shows zero instances of a "portfolio overlap" or equivalent personalized claim referencing tickers not actually present in that account, checked across every Daily Feed and Alerts item visible in one full session.
- [ ] **A4.** Of all Daily Feed items shown in one full session (minimum 20 items), the number of items sharing an identical explanatory sentence with any other item is 0.
- [ ] **A5.** Of the same set of items, the number of distinct "affected sectors" and "affected companies" value-sets is greater than 1 — i.e., not every item shows the same fixed list.
- [ ] **A6.** A first-time test account, on first login, is shown an onboarding flow before reaching a populated workspace — confirmed by direct observation, not inferred.
- [ ] **A7.** Every confidence score shown anywhere in one full session is accompanied by a separately labeled, independently valued uncertainty score, checked on 100% of instances observed.
- [ ] **A8.** Of all directional (Buy/Sell/Hold-equivalent) items shown in one full session, 100% display an explicit, specific invalidation condition.
- [ ] **A9.** Navigation click-through test: each of the product's top-level navigation destinations loads its expected content within 3 seconds, tested once per destination, with 0 failures.
- [ ] **A10.** AI Analysis, Themes, Notifications, Profile, and Settings are each independently confirmed reachable and free of any Critical-severity finding, tested and logged the same way Home/Daily Feed/Recommendations were in `BETA_READINESS_AUDIT.md` — currently unconfirmed and required before this item is checked.
- [ ] **A11.** The Recommendations screen's supersession history (or equivalent) is spot-checked for at least 3 symbols; any symbol showing more than 10 consecutive identical directional entries with no variation is investigated and the finding is logged as either confirmed-genuine or resolved, not left open.
- [ ] **A12.** A destructive action (e.g., portfolio reset) requires an explicit confirmation step, verified by direct observation of the confirmation appearing, not by commit history alone.

**Section A pass condition:** all 12 items checked. Zero exceptions.

---

## Section B — Beta Program Operational Readiness

- [ ] **B1.** Exactly 25 invite candidates are identified, named, and matched against the cohort composition in `PRIVATE_BETA_PLAYBOOK.md` §1 (5 per segment, 5 segments).
- [ ] **B2.** Each of the 25 candidates has confirmed availability for the full 4-week window before an invite is sent.
- [ ] **B3.** Zero of the 25 candidates fall into an excluded category listed in `PRIVATE_BETA_PLAYBOOK.md` §1, confirmed by explicit checklist per candidate, not assumed.
- [ ] **B4.** The beta welcome message (§4 of the playbook) has been sent to, and opened by, 100% of confirmed candidates, tracked individually.
- [ ] **B5.** The beta agreement and expectations document has been acknowledged (explicit confirmation, not silence-implies-consent) by 100% of candidates before their first session.
- [ ] **B6.** The persistent in-app beta banner, linking to bug reporting, trust reporting, and general feedback, is present and clickable on 100% of screens reachable by a beta account.
- [ ] **B7.** A Day-1 personal check-in message has a defined owner and a scheduled send time for each of the 25 candidates, individually tracked.

**Section B pass condition:** all 7 items checked for all 25 candidates — partial completion (e.g., 20 of 25) does not satisfy this section.

---

## Section C — Feedback & Monitoring Systems Readiness

- [ ] **C1.** The bug-reporting flow (playbook §8) is tested end-to-end at least 3 times by a non-engineering team member, with each submission successfully received and visible to the review team within 5 minutes.
- [ ] **C2.** The trust-reporting flow (playbook §9) is tested end-to-end at least 3 times, with the same 5-minute visibility standard.
- [ ] **C3.** The weekly feedback survey (playbook §7) is fully drafted, includes all nine scoring-framework metrics plus the three open questions, and has been test-completed at least once by a non-participant.
- [ ] **C4.** A named individual owns same-day review of every Trust Report, confirmed by name, with a stated maximum response time of 24 hours.
- [ ] **C5.** A named individual owns 48-hour review of every Bug Report, confirmed by name.
- [ ] **C6.** The CEO Dashboard (playbook §12) can currently answer all 6 of its stated questions using real or realistic test data — confirmed by producing one full sample dashboard output before any real participant data exists.
- [ ] **C7.** The feedback categorization system (playbook §10, 10 categories) has been applied to at least 10 sample feedback entries as a dry run, with 100% successfully assigned exactly one primary category.

**Section C pass condition:** all 7 items checked.

---

## Section D — Legal, Privacy, and Safety Readiness

- [ ] **D1.** Every one of the 25 candidates has explicitly agreed to the confidentiality request (no public sharing during the beta window), confirmed individually.
- [ ] **D2.** A clear, written data-handling explanation has been provided to and acknowledged by 100% of candidates, stating what data is collected during the beta and how it is used.
- [ ] **D3.** A defined process exists for a candidate to withdraw from the beta at any time, and that process has been communicated to 100% of candidates.
- [ ] **D4.** Zero candidates are minors without a paired, consenting adult account, confirmed individually.

**Section D pass condition:** all 4 items checked.

---

## Final Go/No-Go

| Section | Items | Checked |
|---|---:|---:|
| A — Product Readiness | 12 | ___ / 12 |
| B — Program Operational Readiness | 7 (× 25 candidates) | ___ / 7 |
| C — Feedback & Monitoring Systems | 7 | ___ / 7 |
| D — Legal, Privacy, Safety | 4 | ___ / 4 |

**Go condition:** every section at 100%. Any section below 100% is a **No-Go**, without exception, regardless of how close to complete it is or how much time pressure exists to launch. A private beta of 25 real people is exactly small enough that there is no good reason to launch on anything less than a full pass — the entire point of a private beta is to be the place mistakes are caught before they reach anyone else, which requires actually being ready, not approximately ready.
