# ImpactOne Definition of Done

**Phase:** RELEASE-GATE-001
**Purpose:** A fast, practical checklist for a single feature, screen, or change — the day-to-day companion to [IMPACTONE_RELEASE_CHECKLIST.md](../operations/IMPACTONE_RELEASE_CHECKLIST.md) and [IMPACTONE_RELEASE_GATES.md](../operations/IMPACTONE_RELEASE_GATES.md). If everything below is true, the change is done enough to submit to the Feature Gate. This list is deliberately short enough to actually use every time, not just once.

A change is **not done** if any box below cannot honestly be checked.

---

## Before calling anything "done"

- [ ] **I opened the running product and interacted with the actual change myself.** Not just read the diff, not just trusted a test passing — clicked it, scrolled it, typed into it.
- [ ] **I ran the automated test suite and it passed**, including any tests I added for this change.
- [ ] **Every button, link, and toggle I touched does something visible or functional when activated.** None are inert.
- [ ] **Every loading/async state has a real, honest state for success, empty, and failure** — none render silently blank.
- [ ] **Any claim my change displays about the user's own data is checked against that user's real state**, not assumed or templated.
- [ ] **No two items I introduced share identical explanatory text for different underlying facts.**
- [ ] **Every score, confidence, or status value I display means exactly one thing, and its label says what it actually is** — not a different metric wearing a familiar label.
- [ ] **I tested at least one mobile portrait breakpoint (390px) and one phone-landscape orientation (844×390 or similar).** Landscape reverting to a desktop-style layout is a known recurring failure in this product — check for it explicitly, don't assume it's fine.
- [ ] **Keyboard-only navigation reaches everything I added**, and every interactive element has an accurate accessible name.
- [ ] **RTL still renders correctly** if my change touched any layout, spacing, or directional styling — verified with logical CSS properties, not assumed.
- [ ] **I did not commit any secret, API key, or credential**, and `.env`/equivalent files remain untracked.
- [ ] **If I'm marking a previously-found issue as fixed, I re-tested the exact original failing condition live and confirmed it's gone** — not inferred from the code change alone.

---

## Before writing a completion report or summary

- [ ] The report describes what I actually verified live, distinct from what I inferred from reading code.
- [ ] Anything I could not verify (server down, feature unreachable, out of scope) is stated as *unverified*, not implied to be fine.
- [ ] Any known remaining gap is named explicitly, not omitted because it wasn't asked about.

---

## Reminder

This document is intentionally short. If a change needs more scrutiny than this list provides — a new screen, a rebuilt flow, anything heading toward real users — it also needs the full [IMPACTONE_RELEASE_CHECKLIST.md](../operations/IMPACTONE_RELEASE_CHECKLIST.md) run against it at the appropriate gate in [IMPACTONE_RELEASE_GATES.md](../operations/IMPACTONE_RELEASE_GATES.md). This list is the floor, not the ceiling.
