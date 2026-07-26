# Morning Experience Blueprint
## Office of the Chief Product Officer — The First 90 Seconds

**Mandate:** Design the single most important 90 seconds this product will ever produce — the one a user experiences every morning, forever, if this product succeeds at all. At one million daily users, this is not a screen. It is the entire business model, repeated a million times a day. Every second below has a stated purpose; a second with no purpose is a second we remove.

**The standard this document is held to:** if any of the 90 seconds below could be deleted without the user noticing a loss, it does not belong in the sequence.

---

## Second-by-Second Design

### 0:00 – 0:02 — Open
**What happens:** The app icon is tapped. The app opens directly into Home. No splash screen holds the user longer than the time needed to avoid a blank flash.
**Purpose:** Zero seconds are spent on the app introducing itself. A user who already installed and opened the app does not need to be sold on it again every morning.
**What must never happen here:** A loading spinner with no shape. A "welcome back" message. Any screen between icon-tap and real content.

### 0:02 – 0:05 — Shape appears
**What happens:** A skeleton loads that exactly mirrors the shape of the real content about to arrive — a headline-sized bar, a one-line summary bar, a small score pair.
**Purpose:** The user's eyes already know where to look before the real words arrive, so reading begins the instant content does, with zero re-orientation cost.
**What must never happen here:** A generic spinner. A skeleton shape that doesn't match what replaces it, causing a layout jump.

### 0:05 – 0:12 — The one headline
**What happens:** Real content replaces the skeleton: one sentence stating the single most relevant thing that happened, specific to this user.
**Purpose:** Answers the only question a user opened the app to ask: *do I need to know anything today?* One sentence, not a list, because a list forces a decision about what to read first — the product has already made that decision correctly, or it has failed at its one job.
**What must never happen here:** A ranked list of five things. A teaser requiring a tap to see what the headline even is.

### 0:12 – 0:25 — Why it matters to me
**What happens:** One additional sentence, directly under the headline, stating why this specific fact matters to this specific user — their holdings, their watchlist, or an honest "this doesn't directly affect what you're tracking" when that's the truth.
**Purpose:** This is the single sentence that separates this product from a generic news alert. If a user could get the same sentence from any other app, this product has not yet done its job in this window.
**What must never happen here:** A generic, templated sentence reused across unrelated headlines — the single most damaging failure mode this product can produce, and the one most likely to be noticed in exactly this ten-second window.

### 0:25 – 0:40 — Confidence and uncertainty, together
**What happens:** Two small, separately labeled numbers appear beside the headline: how strong the evidence is, and how much genuine disagreement exists about it.
**Purpose:** In ten seconds, without reading a paragraph, the user learns whether this is a settled, well-supported fact or a genuinely contested, still-developing one — the single fastest way to teach calibrated trust rather than borrowed confidence.
**What must never happen here:** One blended number standing in for both. A number with no visible label explaining what it means.

### 0:40 – 0:55 — One tap to evidence, optional
**What happens:** If the user taps the headline, a short evidence chain appears — the source, its tier, and the specific claim it supports. If the user does not tap, nothing is lost; the headline alone was already honest and complete.
**Purpose:** Trust is available on demand, not forced on every user every morning — a user who trusts the platform already doesn't need to re-verify every claim, and a user who doesn't yet trust it can always check.
**What must never happen here:** A mandatory expansion. A dead-end tap that produces no new information.

### 0:55 – 1:10 — What changed for me specifically
**What happens:** A second, distinct line: what changed in the user's own portfolio or watchlist since yesterday — including an honest "nothing changed" when that's true.
**Purpose:** This is the moment the product proves it is actually watching the user's specific situation, not just broadcasting the same content to everyone.
**What must never happen here:** A claim about the user's holdings that isn't genuinely true for this account — the single most trust-destroying possible failure in this entire sequence.

### 1:10 – 1:20 — One clear next step
**What happens:** Exactly one suggested next action appears — reviewing a specific recommendation, checking a specific theme, or, on a quiet day, nothing at all, stated as such.
**Purpose:** A user should never leave this 90 seconds wondering "was there something else I was supposed to do." One clear answer, every time, including when the honest answer is "no."
**What must never happen here:** Multiple competing calls to action. A manufactured action on a genuinely quiet day.

### 1:20 – 1:30 — Close, satisfied
**What happens:** The user closes the app, or takes the one suggested action. Either is a success state.
**Purpose:** The entire 90 seconds is designed to end in a feeling of being informed and calm — never a feeling of being left hanging, and never a feeling of being nudged to stay longer than the honest content justified.
**What must never happen here:** A "before you go" prompt. A notification-permission request unrelated to what just happened. Any attempt to extend the session past the point the real content ended.

---

## What Every Second Must Never Contain

- No advertisement, sponsored content, or promotional interstitial, at any point in the sequence, ever.
- No manufactured urgency language ("don't miss this," "act now") anywhere in the 90 seconds.
- No number without a visible label explaining what it measures.
- No claim about the user's specific holdings or watchlist that isn't genuinely true for that account.
- No forced tap, forced scroll, or forced wait beyond what real content genuinely requires.

## The 90-Second Test

Before any change to Home ships, it is timed against this exact sequence with a fresh test account. If any interval above is missed, or if the user reaches second 90 without a clear answer to "do I need to know anything today," the change does not ship, regardless of how good it looks in isolation. At one million daily users, a morning experience that quietly grows to two minutes, then three, has not become richer — it has started charging its users a growing tax on their mornings, and this document exists specifically to prevent that from ever happening one small addition at a time.
