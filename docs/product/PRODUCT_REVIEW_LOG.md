# Product Review Log
## Office of the Chief Product Reviewer — ImpactOne

**Standing mandate:** This document is permanent and append-only. It is never overwritten, never pruned, and never rewritten to look cleaner in hindsight — a finding that is later fixed is marked resolved in place, not deleted. Every entry below is anchored to one obsessive question: *why would millions of people open ImpactOne every morning?* Findings are user-value only — no implementation, no architecture, no code is discussed or reviewed here, only what a real person sees, feels, and experiences.

**How entries are added:** Each review session is a new, dated, numbered entry appended below the previous ones. Findings are numbered `S<session>-F<finding>` so they remain stably referenceable from `EXECUTIVE_PRODUCT_REVIEW.md` and future entries.

---

## Session 1 — 2026-07-14

**Method:** A live walkthrough of the running application (backend + frontend, already active in this environment) — Home, Alerts, and Portfolio were directly exercised and observed. This is a genuine user-value review of the product as it actually renders and behaves today, not a re-read of prior documentation. Findings below are freshly confirmed at the time of this session.

---

### S1-F1 — The main content area is functionally unreachable on load

**Problem:** On opening the app fresh (and again after a full reload), the sidebar navigation occupies the entire visible viewport width. The real Home content — a well-built "daily summary" with six distinct, useful sections — exists in the page and is confirmed present in the underlying page structure, but is not visually reachable: it cannot be scrolled to, and an attempt to bring it into view times out entirely. A user opening the app sees only a list of navigation buttons and nothing else.

**Why users care:** This is not a rough edge — it is the entire product being invisible on first and every subsequent open. A user who opens the app expecting to see "what happened today" sees a wall of buttons instead, with no way to find their actual content.

**Business impact:** This is the single most severe defect possible for this product's stated mission. It has now been independently reconfirmed across multiple review sessions on different days, meaning it is not an intermittent flake — it is a persistent, reproducible failure that makes daily use structurally impossible for any user hitting it. No other finding in this log matters until this one is fixed.

**Recommended solution:** Treat this as the single blocking release-gate item across the entire product. No other user-facing work should be considered "shipped" while this is open, because no user can reach it to benefit from it.

**Priority:** Critical / P0
**Dependencies:** None — this blocks everything else in this log and in `PRODUCT_EXECUTION_BACKLOG.md`.
**Release recommendation:** Release 0 (already logged as R0.1) — status: **still open, reconfirmed live**, escalate.

---

### S1-F2 — Confidence scores do not vary and do not appear to reflect real evidence differences

**Problem:** Six distinct, unrelated Alerts items — "AI infrastructure demand remains strong," "Supply chain bottleneck in semiconductor equipment," "AI capex supercycle," "Fed rate hike," "FOMC Rate Decision," "Shipping rates surge" — were observed live, side by side. Every single one shows an identical confidence value: **88/100**. Only the risk label (medium/high) varies between them.

**Why users care:** The platform's entire trust proposition rests on confidence being a genuine, earned, differentiated signal — sometimes high, sometimes low, always honest. A user who notices that *every single item* carries the exact same confidence number will correctly conclude the number is decorative, not real. This is precisely the "confidence theater" failure the platform's own stated principles exist to prevent, now visibly happening in the live product.

**Business impact:** This is a trust-integrity defect, not a cosmetic one. A skeptical user — precisely the kind of user this product most needs to win over — will notice this within their first few minutes of use, and once noticed, it will retroactively poison trust in every other number the app shows, including ones that may well be genuine and well-computed elsewhere.

**Recommended solution:** Before anything else, confirm whether this is a display issue (a real, differentiated score being overwritten by a shared default somewhere in what the user sees) or a genuine scoring gap. Whichever it is, the user-facing fix is the same: confidence values shown to users must visibly vary in proportion to real differences in the underlying evidence, or the app must not display a number this specific and confident-sounding at all.

**Priority:** Critical / P0
**Dependencies:** None from a user-value standpoint — this is a display/data-integrity issue, not a new feature.
**Release recommendation:** Release 0 (elevate as a new item — this is at least as severe as the layout defect, arguably more damaging because it undermines trust substantively rather than cosmetically).

---

### S1-F3 — Alert explanations are identical boilerplate, not real per-event reasoning

**Problem:** All six Alerts items observed carry the exact same explanatory sentence, verbatim, with only the event name substituted: *"The event '[X]' affects cross-asset pricing through macro regime, positioning, and liquidity channels."* A Fed rate hike and a semiconductor supply-chain bottleneck receive the identical explanation.

**Why users care:** The entire product promise is "we tell you why, specifically, not just what." A copy-pasted explanation is the opposite of that promise, and it is highly visible the moment a user reads two alerts back to back — which, on an Alerts screen showing six items at once, is almost guaranteed to happen immediately.

**Business impact:** Compounds directly with S1-F2. Together, these two findings mean the Alerts screen currently demonstrates the exact failure mode the platform's own foundational documents were written to prevent — and demonstrates it to the user in the very first screen most likely to be opened after a notification.

**Recommended solution:** Every alert shown to a user must carry an explanation that is specific to that event — even a short, honestly-scoped one — never a shared template. If a genuinely specific explanation isn't available yet for a given event, an honest, visibly-labeled placeholder ("we don't have a detailed explanation for this yet") is a better user experience than a confident-sounding sentence that turns out to be generic.

**Priority:** Critical / P0
**Dependencies:** None.
**Release recommendation:** Release 0 (paired with S1-F2 — both must ship together, since fixing one without the other leaves the same trust problem half-visible).

---

### S1-F4 — A Home screen section silently renders blank instead of an honest empty state

**Problem:** Of the six sections on the Home "daily summary" screen, five show genuine, honest content (including good empty-state handling — "No material change vs. yesterday," "No theme thesis has changed recently," "No action needed today"). The sixth, "What changed for my portfolio?", renders its heading with no message underneath at all — a silent blank instead of an honest "nothing to report" statement.

**Why users care:** A blank space next to a real question ("what changed for my portfolio?") reads as broken, not as "nothing happened." The other five sections on the same screen prove the team already knows how to do this correctly — this one section simply missed the same treatment.

**Business impact:** Small in isolation, but it sits on the single most important screen in the product (Home) and directly contradicts the "graceful degradation, always" principle the rest of the same screen already demonstrates correctly. Cheap to fix, disproportionately visible.

**Recommended solution:** Apply the same honest, explicit empty-state pattern already used by the other five sections on this exact screen.

**Priority:** High / P1
**Dependencies:** None.
**Release recommendation:** Release 0 or 1 — small enough to bundle with either.

---

### S1-F5 — A destructive action ("Reset virtual portfolio") has no confirmation step

**Problem:** The Portfolio screen shows a "Reset virtual portfolio" button directly beside the screen title, with no visible confirmation step observed before it would act.

**Why users care:** Even in a simulated/paper-trading context, a user who has spent weeks building a virtual position history does not expect a single accidental tap to erase it. A destructive action this significant deserves friction proportional to what it destroys.

**Business impact:** A user who loses simulated history to a misclick early on will feel the product is careless with their data — a small trust cost that is entirely avoidable.

**Recommended solution:** Add a simple, explicit confirmation step before any reset action executes, stating plainly what will be lost.

**Priority:** Medium / P2
**Dependencies:** None.
**Release recommendation:** Release 3 (bundled with other Portfolio-screen trust work).

---

### S1-F6 — No onboarding gate observed; session lands directly in an unnamed guest workspace

**Problem:** Opening the app fresh goes straight to a live "Home" screen with an account icon reading "G" (guest) — no onboarding, no explanation of what the product is or does, no capture of who the user is or what they care about. This reconfirms a previously known gap, observed live in this session rather than assumed from prior documentation.

**Why users care:** A brand-new user has no way to know what ImpactOne is for, what "confidence," "risk," or the six Home sections mean, or why the eight AAPL/MSFT/NVDA-style quick-access buttons are the ones shown to them specifically (they appear to be a fixed default list, not personalized).

**Business impact:** This remains the single largest predictable cause of first-session abandonment, and it compounds with S1-F1 — a user who could tolerate a confusing-but-reachable Home screen currently cannot even reach it.

**Recommended solution:** Already fully specified in `MOBILE_PRODUCT_MASTERPLAN.md` §1 and scoped as `PRODUCT_EXECUTION_BACKLOG.md` R0.2. This entry exists to confirm, via live observation, that the gap is real and current, not a stale assumption.

**Priority:** Critical / P0
**Dependencies:** S1-F1 (fix the layout defect first, or nobody will see the onboarding either).
**Release recommendation:** Release 0 (already scoped as R0.2) — status: **reconfirmed live, still open**.

---

### S1-F7 — Twelve top-level navigation items is too many for a "check once a day" product

**Problem:** The sidebar lists twelve separate destinations: Home, Dashboard, Global Intelligence, AI Analysis, Watchlist, Portfolio, Recommendations, Daily Feed, Themes, Alerts, My Profile, Settings. Several of these appear to overlap in purpose (Home and Dashboard both plausibly answer "what should I know right now"; Global Intelligence, Daily Feed, and Themes all plausibly answer "what's happening in the world"; Watchlist and Portfolio both plausibly answer "what am I tracking").

**Why users care:** Every additional top-level destination is one more decision a user has to make before they can do the one thing they opened the app to do. A twelve-way choice is a materially higher cognitive load than the five-or-fewer structure this same product's own design strategy has already committed to.

**Business impact:** Navigation complexity is one of the most common, least-visible causes of a new user quietly giving up — not because any single screen is bad, but because deciding *which* screen to open is itself a small tax paid on every single visit.

**Recommended solution:** Consolidate toward the nine-screen model already specified in `MOBILE_PRODUCT_MASTERPLAN.md` §10 (Home, Daily Feed, AI Analysis, Recommendations, Themes, Portfolio, Profile, Settings, Notifications), folding Dashboard into Home, Global Intelligence into Daily Feed/Themes, Watchlist into Portfolio, and Alerts into Notifications. If a screen exists only because it was interesting to build, not because a user needs a twelfth place to look, it should be merged or removed — never kept out of engineering fondness for it.

**Priority:** High / P1
**Dependencies:** None to begin planning; execution depends on Release 0 stabilization first so consolidation isn't built on top of a broken shell.
**Release recommendation:** Release 1–2 (navigation simplification alongside the Home redesign already scoped as R2.1).

---

## Open Items Carried Forward (status check only, not new findings this session)

- AI Analysis screen's historically-flagged multiple/unreconciled rating displays — not independently re-verified this session (navigation to that screen did not complete cleanly, consistent with S1-F1's actionability impact); carry forward as **status unconfirmed, recommend re-check once S1-F1 is resolved.**
