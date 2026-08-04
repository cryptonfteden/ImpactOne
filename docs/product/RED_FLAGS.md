# RED_FLAGS.md

**Phase G2 — Investor Readiness Review**
**Classification key:** every flag below is marked exactly one of:
- **Ignore** — real, but not something that should change an investment decision at this stage.
- **Monitor** — not disqualifying today, but must be checked again with real evidence before or during any real beta, and would become serious if it recurs.
- **Deal breaker** — sufficient on its own to withhold investment until resolved.

---

### 1. No real 5-user beta has actually happened yet
`PRIVATE_BETA_GO_LIVE_CHECKLIST.md` has zero checked items; no file anywhere contains a real user's actual words, name, or usage data. The specific evidence this whole review is meant to evaluate does not exist.
**Classification: Deal breaker** — not because the idea is bad, but because there is nothing to evaluate. This is not a permanent verdict on the company; it is a verdict on the current absence of evidence.

---

### 2. The product cannot currently keep five distinct users' data separate
Every relevant account, portfolio, and profile record is presently a single shared entity. A design for fixing this exists on paper (as of today) but has not been built or tested with real people.
**Classification: Deal breaker for running the beta as-is** — any beta run before this is fixed would not actually produce evidence about five individuals; it would produce evidence about one shared account, five times. Downgrades to **Monitor** the moment this is genuinely fixed and verified with real, distinct users.

---

### 3. A specific false, personalized claim was previously shown to a test account
A documented instance exists of the product stating a specific claim about "your portfolio" that was checked and found false against that account's real, empty state. This is exactly the kind of error that, shown to one real paying user, would be very difficult to recover trust from.
**Classification: Monitor** — a real beta that shows zero recurrence of this specific failure mode is strong positive evidence; a single confirmed recurrence with a real user during a funded beta would immediately become a **Deal breaker**.

---

### 4. Content in parts of the product has read as templated or repetitive on inspection
Independent review has found stretches of explanatory or historical text that repeat near-identically across supposedly distinct items. Nothing dishonest by design, but the kind of thing an attentive early user notices and loses some confidence over.
**Classification: Monitor** — worth asking directly in beta interviews whether any user independently noticed this; if none do, it may not matter to real usage. If several do, unprompted, it becomes a real trust finding, not just an internal observation.

---

### 5. No working general feedback or support channel exists yet
The only functioning feedback mechanism in the shipped product is a narrow, six-option reaction limited to one specific screen. A broader "tell us something's wrong" channel is planned but not built.
**Classification: Monitor** — for a five-person, founder-run beta this is survivable if the founder personally talks to every user directly (as this review's other deliverables recommend); it becomes a real problem the moment the cohort grows past what a founder can personally track by hand.

---

### 6. The backend has previously gone down, unattended, for multi-day stretches with nothing detecting it
Confirmed directly, more than once, during independent testing of this product. No monitoring or alerting exists to catch this automatically.
**Classification: Monitor** — extremely common at this stage and cheap to fix; would become a **Deal breaker** specifically if it happens during the real, funded beta window with real users watching and nobody notices for days.

---

### 7. Live API credentials have been committed to source history
A real, working set of third-party API keys is present in version control, not just in a local, private configuration.
**Classification: Monitor** — a hygiene and cost-exposure issue with a well-understood, cheap fix (rotate the keys, remove them from history). It says something about process maturity at this stage, not about whether the underlying business idea is sound.

---

### 8. The stated audience spans two very different kinds of users
Planning materials describe serving both complete financial beginners and more sophisticated, skeptical, semi-professional users with the same single product and message.
**Classification: Monitor, trending toward Deal breaker if unresolved.** Trying to serve two audiences with genuinely opposite needs is one of the most common reasons an otherwise-promising early product fails to find a clear first customer. The beta itself should be the evidence that resolves this — if five real users across that spectrum give sharply different reactions to the same product, that is itself the answer, and the company needs to pick one audience deliberately rather than let this stay ambiguous past seed stage.

---

### 9. Willingness to pay has never actually been asked of a real user
No document, script, or interview plan produced before this review asked a real user what they would pay, or whether they would pay at all.
**Classification: Deal breaker for an investment decision made today** — trivially fixable by adding the question to the beta interviews (already recommended in this review's companion documents), which would immediately downgrade this to **Monitor** once real answers exist.

---

## What Is Notably Absent From This List

There is no red flag here about the team's judgment or planning discipline — if anything, the self-critical rigor already present in this company's own pre-launch thinking (an evidence-tiered feedback model, a trust model that refuses single-number scores, an honestly-unmet launch checklist rather than a declared "good enough") is a genuinely positive signal about how this team will handle real evidence once it exists. The flags above are about the current absence of real-world proof, not about the quality of the thinking behind the plan to go get it.
