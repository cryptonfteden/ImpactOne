# Mobile Beta Interview Script
## Office of the Mobile Beta Director — ImpactOne

**Mandate:** A concise observation-and-interview script for the first 25 mobile beta users. **Behavior is measured before opinions are asked** — every session begins with silent observation, and no question is asked that could be answered instead by simply watching what the participant actually does.

---

## Before the Session

- Confirm the device is a real, participant-owned device where possible (not a lab device), since natural conditions (their own notification settings, their own network, their own hand size) are part of what's being observed.
- Prepare to take notes only — no coaching, no pointing, no "try tapping that" during the observation phase, even if the participant seems stuck.

---

## Phase 1 — Silent Observation (do not speak yet)

Hand the participant the app already installed, with no instructions beyond "open this the way you naturally would." Observe and record, without any prompting:

- **Where do they tap first?** The exact first element touched, unprompted.
- **What do they visibly hesitate on?** Any pause longer than a few seconds before acting.
- **What do they ignore entirely?** Elements they never touch, scroll past, or visibly skip.
- **What do they re-read or tap more than once?** A sign of confusion or of genuine interest — noted, not yet interpreted.
- **Do they reach for another app or a search engine mid-session?** A direct sign they're verifying something elsewhere rather than trusting what's shown.
- **How long until they either close the app or take a clear action?** Timed, not estimated.

Let the participant use the app, uninterrupted, for a natural session length — do not cut it short to move to questions faster.

---

## Phase 2 — Structured Interview (only after observation ends)

Ask these, in this order, without leading language:

1. "Walk me through what you just did, in your own words." (Tests whether their own account of their behavior matches what was actually observed — a mismatch here is itself a finding.)
2. "Was there anything you weren't sure you understood?" (Never "was anything confusing" — the softer phrasing gets a more honest answer.)
3. "Was there anything you didn't trust, or wanted to double-check somewhere else?"
4. "Did this save you time compared to how you'd normally check something like this?"
5. "If you opened this again tomorrow morning, what would you expect to see?"
6. "Is there anything that would make you stop using this?"

---

## What to Capture, Explicitly

| Field | What to record |
|---|---|
| First tap | The exact first element touched |
| Misunderstandings | Anything the participant's own explanation got wrong or missed, compared to what actually happened |
| Ignored elements | Anything never touched, scrolled past, or visibly skipped entirely |
| Trusted elements | Anything the participant explicitly said they believed without question |
| Verified elsewhere | Any moment the participant reached for another app, browser, or source to double-check something shown |
| Time-saved signal | A direct yes/no plus their own words on question 4 |
| Return-likelihood signal | Their own words on question 5 — specific expectations are a stronger signal than a generic "yes I'd come back" |
| Leave-trigger | Their own words on question 6, recorded verbatim, not summarized |

---

## Categorizing What Comes Back

Every observation and answer is run through the same Noise/Opinion/Evidence/Behavior classification defined in `BETA_FEEDBACK_ANALYSIS.md` before being acted on — a single participant's stated opinion about color or tone is weighted very differently from an observed, repeatable behavior like reaching for a calculator app to verify a number the platform already showed. **Behavior always outweighs stated opinion when the two disagree**, and this script is designed specifically to capture behavior first, before an opinion has a chance to be formed or rehearsed.

---

## What This Script Never Does

- It never asks a leading question ("don't you think this is clear?").
- It never interrupts the observation phase to explain a confusing screen — confusion observed honestly is more valuable than confusion smoothed over in the moment.
- It never treats a polite, positive answer at face value without checking it against what was actually observed in Phase 1.
