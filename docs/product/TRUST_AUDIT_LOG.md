# Trust Audit Log
## Office of the Chief Trust Officer — ImpactOne

**Standing mandate:** This document is permanent and append-only. Nothing is ever deleted or rewritten to look better in hindsight — a breaker that is later fixed is marked resolved in place, with the date it was confirmed fixed, never erased from the record. Every session below is anchored to one question, asked fresh every time: *if I discovered this app today, what would make me doubt it?* Assume, in every session, that this product will eventually manage real money — the standard applied here is never "good enough for a demo."

**Scope discipline:** This log evaluates only what a user can see, click, and read. No implementation, no architecture, and no source code informed any finding below — every entry is backed by direct, observed behavior of the running application.

---

## Session 1 — 2026-07-14

**Method:** A live walkthrough of the running application (backend and frontend already active), covering Home, Daily Feed (28 items fully read), Alerts, Portfolio, and an attempted walkthrough of Recommendations, AI Analysis, Themes, Notifications, Profile, and Settings. Onboarding was evaluated by observing first-load behavior. Several screens could not be reached this session due to a severe interaction defect recorded below (`S1-TB1`/`S1-TB2`) — this is disclosed explicitly per finding rather than silently treated as "no issues found."

---

### 1. Authenticity

**S1-TA1 — Every Daily Feed and Alerts item shares one identical explanatory sentence**
- **Area reviewed:** Daily Feed, Alerts
- **Trust breaker:** All 28 Daily Feed items and all 6 Alerts items carry the exact same sentence, verbatim, with only the event name substituted: *"The event '[X]' affects cross-asset pricing through macro regime, positioning, and liquidity channels."* A Fed rate hike and an "Insider buying cluster" item receive the identical explanation, word for word.
- **Why it reduces trust:** This is the single clearest, fastest way for any user to conclude the platform is not actually reasoning about each event — it is filling in a template. Once noticed on one item, it retroactively discredits every other item on the same screen, including any that may be genuinely well-analyzed.
- **Severity:** Critical
- **Recommendation:** No item should ship with generic boilerplate standing in for real explanation. Where a genuinely specific explanation isn't available, an honestly-labeled placeholder ("a detailed explanation isn't available for this event yet") is less damaging than a confident-sounding sentence that turns out to be copy-pasted.
- **Priority:** P0

**S1-TA2 — Affected sectors and companies default to one fixed list for the majority of items**
- **Area reviewed:** Daily Feed
- **Trust breaker:** The large majority of feed items — including topically unrelated ones like "Congress trading rotation," "Insider buying cluster," "COT positioning inflection," and "Treasury duration squeeze" — display the identical "Affected sectors: Technology, Semiconductors, Energy, Utilities" and the identical "Affected companies: AAPL, NVDA, TSLA, MSFT, BTC, ETH, Oil, Natural Gas, Copper, Gold."
- **Why it reduces trust:** A claim that "Congress trading rotation" specifically affects the same ten tickers as "AI capex supercycle" is not a claim a careful reader can believe once they see it repeated across a dozen unrelated headlines.
- **Severity:** Critical
- **Recommendation:** Either compute genuinely event-specific affected sectors/companies for every item, or do not display this field at all for items where a real, differentiated answer isn't available.
- **Priority:** P0

**S1-TA3 — A minority of named scenario events show genuinely differentiated, well-matched content (positive finding, noted for consistency, not celebration)**
- **Area reviewed:** Daily Feed
- **Trust breaker:** "Oil spike" (Energy, Airlines, Shipping, Consumer sectors; XOM, CVX, DAL, LUV companies), "Israel conflict" (Defense, Energy, Transport, Insurance; LMT, NOC, XOM, GLD), and "BTC ETF approval" (Crypto, Semiconductors, Exchanges; COIN, MSTR, RIOT) all show genuinely topic-appropriate, differentiated content — proving the underlying capability for real, specific analysis exists.
- **Why it reduces trust (as an inconsistency, not on its own):** The existence of well-crafted content alongside generic filler is worse for trust than uniformly generic content would be, because it proves the platform *can* do better and simply isn't doing so consistently — a user who spots both kinds will reasonably ask which kind they're currently reading, with no way to tell.
- **Severity:** High
- **Recommendation:** Extend whatever produces the well-differentiated scenario content to every item, or clearly and honestly distinguish "deeply analyzed" items from "lightly processed" ones in the UI itself.
- **Priority:** P0 (paired with S1-TA1/TA2 — same underlying root cause)

---

### 2. Transparency

**S1-TT1 — Only the first Daily Feed item shows a visible source link**
- **Area reviewed:** Daily Feed
- **Trust breaker:** Of the items reviewed, only the very first ("AI infrastructure demand remains strong") displayed a clickable "Source" link. Every subsequent item showed no visible source at all.
- **Why it reduces trust:** A user cannot verify a claim they cannot trace. The platform's own stated standard is that every material claim is sourced — this session found that standard visibly unmet for the overwhelming majority of what a user actually sees.
- **Severity:** Critical
- **Recommendation:** Every item that makes a factual claim must show a source, or must be visibly and honestly labeled as unsourced/synthesized rather than silently omitting the field.
- **Priority:** P0

**S1-TT2 — "Why this analysis" exists as an affordance but could not be verified to actually function**
- **Area reviewed:** Daily Feed, Alerts
- **Trust breaker:** Every item includes a "Why this analysis" expandable control — a structurally correct instinct — but repeated attempts to open it this session did not complete within a reasonable wait, so its actual content could not be verified.
- **Why it reduces trust:** An affordance that promises deeper reasoning and then appears unresponsive is worse than not offering it at all — it invites a user to look for transparency and then denies them the chance.
- **Severity:** Medium (the intent is sound; verification is what's missing, not necessarily the feature itself)
- **Recommendation:** Re-verify this control independently of the layout defect below, since its failure to respond may share a root cause with `S1-TB1`/`S1-TB2` rather than being a separate problem.
- **Priority:** P1

**S1-TT3 — No invalidation condition or "what would prove this wrong" is shown anywhere observed**
- **Area reviewed:** Daily Feed, Alerts, Home
- **Trust breaker:** Every screen reviewed shows a directional read (opportunity/risk/neutral) and a confidence number, but none shows what specific future evidence would change that view.
- **Why it reduces trust:** Without a stated invalidation condition, a user has no way to know what would make the platform reconsider — which means they also have no way to know whether the platform ever will.
- **Severity:** High
- **Recommendation:** Add an explicit, specific invalidation condition to every directional item, not just a confidence score.
- **Priority:** P1

---

### 3. Consistency

**S1-TC1 — Confidence values cluster into a small number of fixed values correlated with sentiment label, not with the specific event**
- **Area reviewed:** Daily Feed, Alerts
- **Trust breaker:** Across 28 Daily Feed items and 6 Alerts items, confidence is effectively binary-to-ternary: items tagged "opportunity" read 86/100; items tagged "neutral" read 63/100 almost without exception; a handful of named scenarios (Oil spike 86, Israel conflict 81, BTC ETF approval 63) vary slightly but still cluster tightly. No genuinely continuous, event-specific confidence was observed anywhere.
- **Why it reduces trust:** If confidence is a function of a coarse category label rather than the specific evidence for that specific event, it is not confidence — it is a label wearing a number's clothes. This is the single most damaging pattern in this session because it directly contradicts the platform's own foundational promise that a confidence score is an earned, honest, per-claim signal.
- **Severity:** Critical
- **Recommendation:** Confidence must visibly reflect real, per-event evidence differences — including showing low confidence when evidence is genuinely thin, which was not observed a single time across 34 reviewed items.
- **Priority:** P0

**S1-TC2 — Importance scores follow the identical clustering pattern as confidence**
- **Area reviewed:** Daily Feed
- **Trust breaker:** Importance values repeat in fixed steps (84, 76, 68, 60, 57, 52) tightly correlated with the same grouping that drives S1-TC1, rather than varying continuously per event.
- **Why it reduces trust:** Compounds directly with S1-TC1 — two supposedly independent scores moving in lockstep with the same hidden category variable reads as one score with two names, not two honest, independent measurements.
- **Severity:** High
- **Recommendation:** Verify independence between importance and confidence computation; if they are currently derived from the same underlying category, that should not be presented as two separate numbers.
- **Priority:** P1

---

### 4. Evidence

**S1-TE1 — "Portfolio overlap detected" is shown to a user who owns nothing and watches nothing — this session's single most serious finding**
- **Area reviewed:** Daily Feed
- **Trust breaker:** This account's Portfolio screen shows zero open positions and the sidebar Watchlist panel explicitly states it is empty ("Empty because you haven't added a ticker to your watchlist yet"). Despite this, the large majority of Daily Feed items state, verbatim: *"Potential portfolio impact: Portfolio overlap detected in AAPL, NVDA, TSLA"* (or a similar named-ticker variant) — a specific, confident, factual claim that is not true for this account under any reasonable reading.
- **Why it reduces trust:** This is not a generic-sounding template — it is a specific, falsifiable factual claim, and it is false. A rational, skeptical long-term investor (the exact user this product needs most) would need only to notice they own nothing to catch the platform in a direct, verifiable misstatement about their own data. Nothing else in this audit is more damaging than a platform that says something concrete and checkable about "your portfolio" that isn't true.
- **Severity:** Critical — the highest-priority finding in this session, above even the layout defect, because a broken screen reads as "unfinished" while a false personal claim reads as "not honest."
- **Recommendation:** This line must never render unless the referenced tickers are actually present in the user's real holdings or watchlist. This is the smallest possible fix with the largest possible trust return (see Trust Recovery, below) — a conditional display rule, not a new analytical capability.
- **Priority:** P0, above all other findings in this session

**S1-TE2 — The overwhelming majority of claims reviewed this session have no visible, traceable source**
- **Area reviewed:** Daily Feed, Alerts
- **Trust breaker:** Of roughly 34 distinct claims reviewed across Daily Feed and Alerts, exactly one showed a source link.
- **Why it reduces trust:** An unsourced claim is, by the platform's own stated standard, not evidence — it is an assertion. A user cannot independently verify anything shown on either screen except the one item with a link.
- **Severity:** Critical
- **Recommendation:** Same as S1-TT1 — every claim needs a real source or an honest label admitting it doesn't have one.
- **Priority:** P0

---

### 5. Uncertainty

**S1-TU1 — No uncertainty score, distinct from confidence, appears anywhere observed**
- **Area reviewed:** Daily Feed, Alerts, Home
- **Trust breaker:** Every scored item shows exactly one number ("Confidence"). No separate disagreement/uncertainty indicator was observed on any screen reached this session.
- **Why it reduces trust:** The platform's own foundational principle is that confidence (signal strength) and uncertainty (disagreement) must never be collapsed into one dial, because a claim can be strong and genuinely contested at the same time. What a user actually sees today is exactly the single-dial pattern the platform's own governing documents call epistemically inadequate.
- **Severity:** Critical
- **Recommendation:** Ship a second, independently-labeled uncertainty indicator alongside every confidence score, everywhere confidence currently appears alone.
- **Priority:** P0

**S1-TU2 — Not a single low-confidence item appeared across 34 reviewed claims**
- **Area reviewed:** Daily Feed, Alerts
- **Trust breaker:** Every single item, regardless of topic, scored between 52 and 88 out of 100 — none below the midpoint, none reading as genuinely uncertain.
- **Why it reduces trust:** It is not statistically credible that 34 independent real-world events would all warrant above-midpoint confidence. The honest, expected pattern is a real spread, including some genuinely low scores. Their total absence reads as manufactured uniformity, not honest variation.
- **Severity:** High
- **Recommendation:** Confirm the scoring path can and does produce low scores for genuinely thin evidence, and that this was simply not represented in today's specific feed contents rather than structurally impossible.
- **Priority:** P1

---

### 6. Language

**S1-TL1 — "Personalized to your portfolio, watchlist, and profile" overstates what the content actually reflects**
- **Area reviewed:** Daily Feed (header copy)
- **Marketing-sounding sentence, as observed:** *"Real events, scored for importance and confidence, personalized to your portfolio, watchlist, and profile."*
- **Why it reduces trust:** This account has no portfolio holdings and no watchlist entries, yet the screen both claims personalization and displays a false "overlap detected" claim (S1-TE1) that only makes sense if personalization were genuinely happening.
- **Rewritten as a factual statement:** *"Events are scored for importance and confidence. Portfolio and watchlist relevance is shown only where a real holding or watchlist entry matches."*
- **Severity:** High
- **Recommendation:** Adopt the rewritten version, and make it true before restoring the claim.
- **Priority:** P1

**S1-TL2 — "Live intelligence workspace" is vague, tone-only copy with no verifiable content**
- **Area reviewed:** Global header banner
- **Marketing-sounding sentence, as observed:** *"Live intelligence workspace."*
- **Why it reduces trust:** "Intelligence" and "live" are both claims a skeptical reader will want evidence for — neither is explained anywhere nearby (how live? refreshed how often? intelligence based on what?).
- **Rewritten as a factual statement:** A short, specific statement of actual data recency (e.g., "Market data as of [timestamp]; analysis reflects evidence available as of publish time") in place of the tagline, or alongside it.
- **Severity:** Low
- **Recommendation:** Replace or supplement with a specific, checkable freshness statement.
- **Priority:** P2

---

### 7. Behavior (first-time user hesitation log)

**S1-TB1 — Main content is not reliably reachable on load or reload**
- **Area reviewed:** Home (and, by extension, every screen)
- **Trust breaker:** On fresh load and again after a full reload, the real Home content existed in the page but could not be reliably brought into view or interacted with; a real first-time user would see what looks like an empty or broken screen.
- **Why it reduces trust:** A product that appears broken on arrival never gets the chance to earn trust on any of the dimensions above — this is the precondition for every other finding in this log mattering at all.
- **Severity:** Critical
- **Recommendation:** Already logged and escalated in prior product-review work; re-escalated here specifically as a *trust*, not just usability, issue — a broken first impression is a trust cost, not merely an inconvenience.
- **Priority:** P0

**S1-TB2 — Navigation clicks intermittently produce no visible response**
- **Area reviewed:** Recommendations (attempted), Daily Feed (attempted expand)
- **Trust breaker:** Clicking "Recommendations" in the sidebar and clicking "Why this analysis" on a feed item both produced no observable change after a long wait, with no loading indicator, no error, and no explanation.
- **Why it reduces trust:** A first-time user facing an unresponsive click has no way to know whether the app is thinking, broken, or ignored their tap — silence in the face of an action is one of the fastest ways to lose a new user's benefit of the doubt.
- **Severity:** Critical
- **Recommendation:** Every interactive control must show an immediate, visible response to a tap — even if the response is only a loading state — within a fraction of a second.
- **Priority:** P0

**S1-TB3 — The account indicator ("G") is unexplained**
- **Area reviewed:** Global header
- **Trust breaker:** A single-letter account indicator appears in the header with no onboarding, tooltip, or menu content observed explaining what it means or how to change it.
- **Why it reduces trust:** A small thing, but a first-time user reasonably wonders "is my data being saved, and to what identity" — leaving that unanswered is a quiet, ambient hesitation point.
- **Severity:** Low
- **Recommendation:** Label it plainly ("Guest — data may not be saved between visits") until real accounts exist.
- **Priority:** P2

**Onboarding — reconfirmed absent.** No onboarding flow, explanation, or expectation-setting was observed on first load; the session begins directly inside a live, populated "Guest" workspace. Recorded here as a standing, carried-forward finding rather than a new one — see prior product-review work for full detail.

---

### 8. Trust Recovery — the smallest fix for the worst breaker

The single worst finding this session is `S1-TE1` (a false, specific "portfolio overlap detected" claim shown to a user with no portfolio). The smallest possible change that recovers the most trust: **suppress the portfolio-impact line entirely whenever the referenced tickers are not genuinely present in the user's real holdings or watchlist.** This requires no new evidence, no new analysis, and no new copy — only a conditional display rule — and it is very likely the single highest trust-return-per-effort fix available anywhere in the product today.

---

### 9. Competitive Trust Review (trust only, not features)

| Compared to | Where ImpactOne currently feels weaker | Where ImpactOne could feel stronger (once the findings above are fixed) |
|---|---|---|
| **Bloomberg** | No verified, institutional-grade data provenance visible yet; templated content (S1-TA1/TA2) reads as far less rigorous than Bloomberg's flat, unopinionated factual reporting | Bloomberg never explains *why* something matters to a specific portfolio, or shows its own confidence/uncertainty; ImpactOne's stated model, once real, is a genuine differentiator Bloomberg does not attempt |
| **TradingView** | No visible community or track record to anchor credibility the way TradingView's public, dated chart annotations do | A single coherent, evidence-linked narrative per event beats TradingView's crowd-sourced quality variance, once ImpactOne's own evidence is actually differentiated |
| **Reddit** | Ironically, Reddit's raw, unpolished posts feel more "authentic" than ImpactOne's current templated copy — the platform most associated with human genuineness currently reads more genuine than this one | Reddit has zero accountability or track record; ImpactOne's planned honest, graded track record is something Reddit structurally cannot offer |
| **X / FinTwit** | Trust on X is personality-based (a followed analyst's track record); ImpactOne has no equivalent anchor yet | A platform-level, audited track record is more durable and less gameable than any single followed account's reputation |
| **ChatGPT** | The current templated-confidence pattern (S1-TC1) makes ImpactOne look exactly like a fluent, confident-sounding wrapper — the single worst possible comparison for a product whose entire differentiator is *not* being that | Real, honest confidence/uncertainty and a graded track record are precisely what ChatGPT does not and structurally cannot offer for financial claims |
| **Perplexity** | Perplexity attaches a citation to nearly every specific claim; ImpactOne currently sources roughly one claim in thirty-four (S1-TE2) | Once fixed, per-claim sourcing tied to a portfolio-specific narrative (not just a generic answer) is a stronger, more personally relevant version of the same idea |
| **Google Finance** | Google Finance makes no interpretive claims at all, so it can never be caught being wrong about "your portfolio" the way S1-TE1 does | ImpactOne's entire value proposition is interpretation Google Finance doesn't attempt — but only once that interpretation is demonstrably earned, not templated |

**Summary:** ImpactOne's current live state compares unfavorably to every platform on this list on raw execution, and most damagingly resembles the least-trusted comparison (a confident AI wrapper) rather than the most-trusted one (a disciplined, source-verified terminal). The strategic positioning is sound and genuinely differentiated on paper; none of it is currently demonstrated in the live product.

---

### 10. Habit Review

**Would a rational, long-term investor naturally open this every morning? Not yet.** Exactly four things are missing, in order of severity:

1. **A reachable, working screen** (S1-TB1/TB2) — nothing else matters until this is true.
2. **Real, differentiated, evidence-specific content** instead of templated filler (S1-TA1/TA2/TC1) — a rational investor checks a source because it tells them something they didn't already know, specifically; a template cannot do that twice before being recognized as one.
3. **Zero false personal claims** (S1-TE1) — a single caught falsehood about "my portfolio" is enough to make a rational investor stop trusting every other number on the screen, permanently, on the first occurrence.
4. **A visible, honest uncertainty signal** (S1-TU1) — a rational long-term investor is specifically the user most likely to want to know when the platform is genuinely unsure, and currently has no way to see that at all.

---

## Resolved Since Prior Sessions (credit given where due)

- The Home screen's "What changed for my portfolio?" section, previously observed rendering a silent blank paragraph, now shows an honest, specific message ("No prior-day snapshot yet — this is the first day being tracked.") as of this session. Marked **resolved**, dated 2026-07-14.
