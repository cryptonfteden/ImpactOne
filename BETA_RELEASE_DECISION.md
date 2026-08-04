# BETA_RELEASE_DECISION.md

**Phase E3.5 — Final Beta Gate**
**Date:** 2026-07-23

---

## Decision

# GO WITH KNOWN LIMITATIONS

I would personally invite five external users to ImpactOne's closed beta today, provided the limitations listed below are disclosed to them up front (a short paragraph in the invite/welcome message is enough — the product's own onboarding modal already covers the three most important expectation-setting points: recommendations may start empty, the portfolio is simulated, and everything is advisory-only).

---

## Scores (1-10)

| Category | Score |
|---|---|
| Trust | 7 |
| Usability | 8 |
| Professionalism | 6 |
| Investment credibility | 7 |
| Release confidence | 7 |

**Overall: 7/10**

---

## Why GO (not NO-GO)

- No blocker was found. Every issue identified degrades politely — repetitive wording, a cluttered list, an awkward screen orientation — none of it crashes, blocks a task, or misrepresents the user's own money or holdings.
- Directly re-verified (not assumed) that account data and the claims made about it are consistent: portfolio concentration, holdings-based recommendations, and overlap claims all check out against the real account state.
- The single highest-credibility-risk item from the prior review (a card ambiguously labeled "Recommendation" that was actually third-party analyst data) has been fixed and was confirmed live this session.

## Why "WITH KNOWN LIMITATIONS" (not a clean GO)

- Two of the three previously-identified fixes were **not** actually completed, despite the mission's framing that "Beta Polish work is complete" — verified directly via `git log`/`git diff` plus a live re-test rather than taken on faith:
  - Daily Feed explanation text is still shared verbatim across unrelated headlines that match the same historical pattern.
  - The Recommendations screen's "Lessons Learned" list still shows near-duplicate entries.
- A previously-known phone-landscape navigation regression (reverts to the full 11-item desktop sidebar instead of the mobile bottom nav) is also still present, confirmed via direct viewport resize and element visibility check.
- None of these rise to "delay the beta" severity, but a careful beta user — exactly the kind whose feedback matters most for a 5-person cohort — is likely to notice at least one of them within the first week. Disclosing them proactively converts "did they lie to me?" into "they told me exactly what's rough," which is the more trust-building outcome.

---

## Known Limitations to Disclose to Beta Users

1. Some Daily Feed items currently share very similar explanation wording when they match the same historical pattern — the pattern match is real, the phrasing isn't fully distinct yet.
2. The Recommendations screen's "Lessons Learned" list can show repeated-looking entries for the same symbol — each is a real graded outcome, just not yet deduplicated for display.
3. Rotating a phone to landscape currently shows the full desktop-style menu rather than the simplified mobile navigation — best used in portrait on phones for now.
4. Notification and appearance settings are fixed defaults for this beta (already disclosed in-app) — no per-user customization yet.

---

## What Would Move This to a Clean GO

Completing the two still-open items from the prior review's top-3 ROI list (Daily Feed de-templating, Lessons Learned de-duplication) plus the landscape-nav breakpoint fix — all three are display-layer changes already scoped and none require touching the recommendation engine, committee, or learning pipeline.
