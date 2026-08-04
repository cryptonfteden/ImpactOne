# Risk Register

Every known project risk, with Probability, Impact, Mitigation, and Owner. Probability/Impact are qualitative (Low/Medium/High) — this project has no quantitative incident data to ground a numeric estimate, and asserting false precision would misrepresent the evidence. **Owner** reflects who is realistically positioned to act (an engineering session, a founder-level decision, or an external dependency) — not an assignment of blame.

---

### R1. Exposed live API keys in git history
- **Probability:** High that keys remain valid and exploitable today (no evidence of rotation found anywhere in the audit trail).
- **Impact:** High — a leaked `OPENAI_API_KEY` or `FINNHUB_API_KEY` could result in unauthorized usage/cost, and a public/forked copy of this repo would expose them permanently in history.
- **Mitigation:** Rotate both keys immediately at the provider level; scrub git history (`git filter-repo` or BFG) as a coordinated, destructive operation; add `.env` to `.gitignore` going forward (partially done — the file is untracked as of Phase H2, but the historical commits remain).
- **Owner:** Founder/account holder — requires provider-account access no engineering session has.

### R2. Incomplete confirmation of user-scoping across all 50 Prisma models
- **Probability:** Medium — one confirmed instance (`UserMemoryEvent`) existed undetected for ~4 months; the same rollout pattern (Phase H2) covered only 5 models, deliberately, at the time.
- **Impact:** High if a real gap exists — any model missing scoping is a potential repeat of the exact incident just fixed.
- **Mitigation:** A systematic, one-time audit of every model with a plausible per-user meaning, checking for a `betaUserId`/`userId` column and confirming every read filters by it.
- **Owner:** Next engineering session — this is a bounded, well-defined task.

### R3. No crash recovery, no CI, no monitoring (compounding trio)
- **Probability:** High — already caused confirmed multi-day undetected outages in this project's own history (independent testing found the app blank with no error surfaced).
- **Impact:** High — every minute of undetected downtime is invisible to the team and to any real beta users.
- **Mitigation:** Stand up a process supervisor (pm2/systemd) with restart-on-crash; add a minimal CI pipeline running `npm run build` + full test suite on every push; add basic uptime/error-rate alerting (even a free-tier external ping service would close most of the exposure).
- **Owner:** Next engineering session — named across multiple sources as the single most consequential remaining engineering gap.

### R4. Two coexisting frontend architectures, widening not narrowing
- **Probability:** Certain (already true) — confirmed 5 vs. 10 screen split, and this session added 2 more Workspace screens without touching the older set.
- **Impact:** Medium — increases the surface area two engineers could disagree about which pattern to follow, and doubles the cost of any future cross-cutting fix.
- **Mitigation:** A deliberate decision (not necessarily this session's) to either migrate the remaining ~10 screens or explicitly declare them legacy/retiring.
- **Owner:** Product/engineering leadership — this is a scope decision, not a pure engineering task.

### R5. Three uncoordinated personalization services
- **Probability:** Certain (already true).
- **Impact:** Medium — each computes a related-but-distinct notion of "what this user prefers," with no shared canonical object; a future feature reading the wrong one could produce inconsistent personalization across screens.
- **Mitigation:** Consolidate into one canonical personalization object, following the same precedent this session used for `claimPresentation.js`/`intelligenceEngine.js`.
- **Owner:** Next engineering session.

### R6. Options Agent and 9 other agent domains have no live data vendor
- **Probability:** Certain (already true) — explicitly disclosed as honest stubs, not fabricated.
- **Impact:** Low currently (nothing is being misrepresented as real), Medium in opportunity cost (named across multiple documents as "the single highest-leverage unlock" for the platform's broader narrative).
- **Mitigation:** A funded vendor relationship — an external dependency, not a code fix.
- **Owner:** Founder/business decision (budget, vendor negotiation).

### R7. Recurring "assumed shape didn't match real API response" bug class
- **Probability:** High — this exact failure mode has recurred at least 7 times across unrelated subsystems and different points in the project's history (Sprint 24's month/year regex bug, X5/X7's missing `symbolIntelligenceApi.js`, X12C3.1's `heldPosition` field, this session's `macroRegime` and sentiment `trend` bugs, `PLATFORM-INTEGRATION-001`'s ordering bug, and the recurring "false portfolio overlap" pattern across Sprints 25/26/36/37/39/40).
- **Impact:** Medium per-instance (each one was caught before or shortly after shipping), but the *pattern* itself is a standing risk — every instance was caught by a human running the thing live, never by an automated check.
- **Mitigation:** A lightweight contract/schema test between each screen's mock-data fallback module and its real backend response shape would catch this class of bug automatically. No such mechanism exists today (M4/M17 in `KNOWN_GAPS.md`).
- **Owner:** Next engineering session — this is the single most actionable, concrete lesson from the entire audit trail.

### R8. No completed real-user private beta
- **Probability:** Certain (already true, per this pack's own review of the audit trail — no evidence found of a finished beta with real external humans).
- **Impact:** High — every "Done"/"GO" status in this project describes technical readiness, not user validation; the product's actual fit and usability with real, non-founder users remains unmeasured.
- **Mitigation:** Run the real 25-person beta `CEO_NEXT_12_MONTHS.md`'s own Q1 calls for, to completion, before further feature expansion.
- **Owner:** Founder/product leadership — this is a go-to-market decision, not an engineering task.

### R9. Documented architectural rules with no automated enforcement mechanism
- **Probability:** High — this exact pattern already recurred twice at significant cost (the Committee's "never a second verdict" rule, violated 9 sprints; `UserMemoryEvent`'s missing scoping, undetected ~4 months).
- **Impact:** High cumulative — every future architectural rule this project writes down is only as durable as the next human audit that happens to re-check it.
- **Mitigation:** Convert the project's highest-value documented rules (one canonical verdict, no blended confidence, append-only + user-scoped memory, personalization-never-touches-facts) into actual source-grepping or runtime tests, the way `unification.test.js` and the append-only immutability tests already do for two of them.
- **Owner:** Next engineering session — a bounded, incremental task per rule.

### R10. Learning loop cannot yet correct live decisions
- **Probability:** Certain (already true, by design).
- **Impact:** Low today (deliberately scoped, not an oversight), Medium as an opportunity cost if left unaddressed indefinitely — Sprint 42's own independent verdict named "Future Learning Potential" as the platform's most significant remaining weakness (2/10).
- **Mitigation:** The project's own `PHASE_D_ROADMAP.md`/`LEARNING_ARCHITECTURE.md` already specify a staged, human-approval-gated path — follow it only as real data justifies each stage, per Sprint 43's own explicit finding that the training data isn't ready yet.
- **Owner:** Founder-level decision on pacing, engineering execution once approved.

---

## How to read this register

Every risk above traces to a specific, named finding already in this project's own audit trail or this session's own direct work — none are speculative additions invented for this pack. The register is ordered roughly by combined probability×impact, with R1–R3 the most urgent, and is meant to be read alongside `KNOWN_GAPS.md` (what's missing) and `PROJECT_HEALTH.md` (the resulting graded assessment).
