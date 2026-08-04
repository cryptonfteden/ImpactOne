# Dataset Exit Review
## Phase D1.5 — Can This Dataset Exit Remediation?

**Purpose:** Sprint D1 (2026-07-22, earlier the same day) issued a verdict of **REMAIN IN DATA REMEDIATION** with four required fixes. This review checks, with fresh live-database evidence, whether any of them have been addressed and whether the dataset is now eligible to exit remediation and proceed toward D2.

---

## Status of Sprint D1's Required Fixes

| # | Required fix (from Sprint D1) | Status today |
|---|---|---|
| 1 | De-duplicate or down-weight duplicate-content recommendations (76% of dataset) | **Not addressed.** Identical counts today: 212/279 duplicate-content rows, 68/96 duplicate-content graded outcomes. |
| 2 | Populate benchmark data on graded outcomes | **Not addressed.** Still 0/96. |
| 3 | Root-cause the 2+2 confirmed referential breaks | **Not addressed.** Same 4 broken references found, unchanged. |
| 4 | Expand symbol diversity beyond 3 tickers before generalizing | **Not addressed.** Still exactly 3 symbols (NVDA, TSLA, AAPL) in the dataset's entire history. |

**None of the four required fixes have been made.** This is not a surprising or concerning finding on its own — it reflects the underlying reason correctly: **the autonomous engine that produces this data has not run at all since 2026-07-20T19:30**, matching the ongoing backend outage. A dataset cannot remediate itself while the system producing it is offline, and no manual remediation (e.g., a backfill or cleanup script) has been applied either, based on identical row counts across both audits.

---

## New Information Since Sprint D1

1. **The dataset is frozen, not merely flawed.** 354 `AutonomousRunLog` rows exist, the last one starting 2026-07-20T19:30:01 — roughly two days of complete silence. Every number in this review and in Sprint D1 describes a static snapshot, not an actively evolving dataset.
2. **A "false success" operational pattern was found.** Provider run logs report 100% `SUCCESS` in their most recent 30 entries (9,370 total historically), while the database holds exactly one real ingested evidence event across its entire life. Operational health logging in this system currently cannot be trusted as a proxy for data substance.
3. **Zero `UNGRADEABLE` outcomes have ever been produced**, meaning the system's own "we couldn't grade this" honesty path has never actually been exercised — not necessarily a problem, but an untested path worth knowing about before relying on it.

---

## Exit Criteria Assessment

A dataset should only exit remediation and be considered eligible for D2 when:

- [ ] Duplicate-content contamination is resolved or explicitly controlled for — **not met.**
- [ ] A meaningful fraction of graded outcomes carry real benchmark data — **not met (0%).**
- [ ] Known referential integrity breaks are explained and closed — **not met.**
- [ ] The evaluated universe is broad enough to support a generalizable claim — **not met (3 symbols).**
- [ ] The system producing new data is actually running, so remediation progress can be measured going forward — **not met (engine offline ~2 days).**

**Zero of five exit criteria are met.** This dataset should not exit remediation at this time.

---

## Recommendation

Do not proceed to D2 planning against this dataset in its current state. The most immediate blocker is not even a data-quality fix — it is that **the system generating this data has been down for two days**, so no remediation work, even if started today, could be validated against fresh data yet. Once the backend is restored, remediation should be re-attempted and this exit review re-run before any further phase-D planning proceeds.
