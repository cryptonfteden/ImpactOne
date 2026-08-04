# Mobile Trust Audit Framework
## Office of the Mobile Beta Director — ImpactOne

**Mandate:** Define exactly how to detect ten specific ways a mobile product can quietly erode trust — each with a concrete, repeatable detection method, not a vague reminder to "watch out for it."

---

## 1. Stale Data Shown as Current
**How to detect:** Force a network delay or disconnect, note the last real update timestamp, then check whether the UI continues to present that data without any visible age or staleness indicator. **Fail condition:** any data older than its defined freshness threshold displayed with no visible label.

## 2. False Personalization
**How to detect:** Use a test account with zero portfolio holdings and an empty watchlist; check every screen for any claim referencing specific holdings, tickers, or "your portfolio" language. **Fail condition:** any personalized-sounding claim that doesn't correspond to real account data.

## 3. Repeated AI Boilerplate
**How to detect:** Capture the explanatory text of at least 20 distinct content items in one session; compare them for verbatim or near-verbatim repetition. **Fail condition:** any two distinct items sharing an identical explanatory sentence.

## 4. Confidence That Looks Fabricated
**How to detect:** Record the confidence value of at least 20 distinct items; check whether the values cluster into a small number of fixed points correlated with a coarse category (e.g., sentiment label) rather than varying continuously per item. **Fail condition:** fewer than a genuinely broad distribution of distinct confidence values across the sample, or any visible correlation between confidence and a simple category tag rather than item-specific evidence.

## 5. Unclear Uncertainty
**How to detect:** For every confidence score observed, check whether a separately labeled uncertainty value appears alongside it. **Fail condition:** any confidence score shown without an adjacent, independently valued uncertainty score.

## 6. Misleading Offline Behavior
**How to detect:** Force the device offline mid-session; observe whether the app presents cached content as live, freezes silently, or clearly labels the offline state. **Fail condition:** any screen that continues to look "live" while offline with no visible indicator.

## 7. Unexplained Failures
**How to detect:** Force a provider or network failure; check whether the resulting screen state includes a plain-language explanation and a next step, versus a blank screen, raw error, or silent infinite loading state. **Fail condition:** any failure state with no explanation or no available next step.

## 8. Accidental Destructive Actions
**How to detect:** Attempt every destructive action in the app (reset, delete, disconnect) via a single tap and observe whether a confirmation step appears before the action executes. **Fail condition:** any destructive action that completes without an intervening confirmation step.

## 9. Mobile Layouts That Hide Critical Context
**How to detect:** On the smallest supported screen size, check whether every element required to understand a claim (confidence, uncertainty, source, invalidation condition) is reachable without the screen becoming unresponsive, content being pushed off-viewport, or requiring a scroll depth beyond the platform's stated maximum. **Fail condition:** any critical context element that cannot be reached, or that requires an interaction that fails to respond within a reasonable wait.

## 10. Educational Content That Becomes Patronizing
**How to detect:** Track how many times the same inline explanation is shown to the same test account after that account has already engaged with the underlying content multiple times without needing it. **Fail condition:** the identical explanation reappearing for a concept the account has already demonstrably encountered and engaged with several times, with no sign of the fade-once-understood behavior this platform requires.

---

## How This Framework Is Used

Every mobile beta review cycle runs all ten checks against the current build, using a real device, a real test account, and forced-failure conditions where relevant — never inferred from source code or assumed from a specification. Each check produces a pass or a specific, dated fail entry, logged the same way `TRUST_AUDIT_LOG.md` logs findings: append-only, with exact evidence, never overwritten.
