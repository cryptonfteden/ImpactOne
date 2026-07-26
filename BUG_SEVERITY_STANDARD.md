# Bug Severity Standard
## Office of the Private Beta Readiness Board — ImpactOne

**Mandate:** Define Critical, High, Medium, and Low with objective, observable examples — every example below was directly, personally observed in this product's own live history, not hypothesized, so this standard is grounded in real precedent rather than abstract category definitions.

---

## Critical
**Definition:** Blocks the product's core promise entirely, or produces a specific, checkable false statement to a user, or destroys user data without consent.

**Observed examples:**
- The main content area failing to reliably load or become interactive on fresh open — confirmed, repeatedly, across multiple independent review sessions before being fixed.
- A Daily Feed item stating "Portfolio overlap detected in AAPL, NVDA" against a test account with zero open positions and zero watchlist entries — **reconfirmed live as of this writing, still present**, a specific, false, checkable claim about a user's own data.
- A destructive action (portfolio reset) executing with no confirmation step.

**Rule:** any Critical finding pauses the beta for all participants until resolved.

---

## High
**Definition:** Materially damages trust or usability for a meaningful share of users, but doesn't block the core loop or fabricate a specific false claim.

**Observed examples:**
- Multiple distinct Daily Feed items sharing identical explanatory text because they were grouped into the same historical-analogy bucket (e.g., "Fed rate hike," "FOMC Rate Decision," and "Shipping rates surge" all receiving the exact same "most comparable to 'Rate Hikes' (88% historical similarity)" sentence, word for word) — **reconfirmed live as of this writing**: a real improvement over full-feed-wide identical text, but still a templated failure mode at a coarser grain.
- Confidence values clustering into a small number of fixed points correlated with a coarse category rather than varying per item.
- A navigation control that fails to respond within a reasonable wait with no loading indicator.

**Rule:** fixed before the next release cycle; affected participants are told specifically what was found.

---

## Medium
**Definition:** A real, noticeable defect that doesn't damage trust or block core use, but should be fixed before wider release.

**Observed examples:**
- Header icons (notifications, quick actions, account menu) stacking awkwardly on narrow mobile viewports.
- An educational explanation that hasn't yet started fading for an account that has clearly already demonstrated understanding.
- A source link present on only some, not all, items that make a sourced claim.

**Rule:** logged, scheduled, and batched into the next regular release — never left informally unscheduled.

---

## Low
**Definition:** Cosmetic or minor friction with no effect on trust, evidence integrity, or core usability.

**Observed examples:**
- Minor visual spacing inconsistencies between two otherwise-correct card layouts.
- A tooltip that could be phrased slightly more concisely without changing its meaning.

**Rule:** logged, addressed opportunistically, never allowed to block a release on its own.

---

## The One Rule That Applies to All Four Levels

Severity is assigned from what was actually observed, not from how the underlying cause is guessed to work — a finding is classified by its user-facing effect, confirmed live, never downgraded because a fix "should be simple" or upgraded because a fix "sounds hard." Ease of fixing is never a factor in severity classification.
