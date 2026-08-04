# Feature Priority Matrix
## Office of the Chief Product Officer — ImpactOne

**Mandate:** Review every current feature and classify it: **Must Keep**, **Improve**, **Merge**, **Hide**, **Remove**, or **Future**. No feature survives this review by default — every classification below is justified on its own, not assumed from the feature already existing. A feature that exists only because it was interesting to build, not because a user needs it, is removed or hidden regardless of engineering effort already spent on it.

---

## Screens

| Feature | Classification | Justification |
|---|---|---|
| **Home** | **Must Keep** | The single most important screen in the product — the six-question daily-summary structure is exactly the right shape for this product's mission. Currently blocked by a reachability defect; the feature itself is not in question, its current execution is. |
| **Dashboard** | **Merge** (into Home) | A second screen answering a near-identical question to Home ("what should I know right now") creates a redundant decision a user shouldn't have to make. One of these two names should disappear entirely. |
| **Global Intelligence** | **Merge** (into Daily Feed / Themes) | Overlaps substantially with what Daily Feed and Themes already cover; a dedicated third destination for "what's happening in the world" is one navigation choice too many. |
| **AI Analysis** | **Improve** | Genuinely valuable deep-dive capability, but historically flagged for multiple, potentially unreconciled rating displays on one screen — must be resolved and re-verified before it can be trusted at scale. |
| **Watchlist (as a separate screen)** | **Merge** (into Portfolio, keep the sidebar panel) | A user tracking symbols they don't yet own and symbols they do own is answering one underlying question — "what am I following" — and does not need two separate destinations for it. |
| **Portfolio** | **Must Keep** | Core to the product's entire value proposition; already well-built (honest empty states, clear simulated-trading disclosure, a real rules/limits display). |
| **Recommendations** | **Must Keep** | Currently the single strongest screen in the product — real per-symbol confidence and uncertainty, explicit invalidation conditions, a transparent quality breakdown, and an honest committee split. This is the feature the rest of the product should be built up to match, not down from. |
| **Daily Feed** | **Must Keep, Improve urgently** | The screen the entire "open every morning" mission depends on most, and currently the least trustworthy screen in the product — templated explanations, generic sector/company lists, and a false personalized claim for empty accounts. The feature is essential; its current execution is disqualifying until fixed. |
| **Themes** | **Improve** | A sound organizing concept (standing narratives a user can follow), currently underbuilt — needs real theme-to-holdings mapping to justify being its own destination rather than a tag inside Daily Feed. |
| **Alerts** | **Merge** (into Notifications) | Functionally a filtered, urgent subset of Daily Feed content; maintaining it as a fully separate screen with its own list duplicates content a user has likely already seen. |
| **My Profile / Investor Profile** | **Must Keep** | Necessary for honest personalization (risk tolerance, horizon) and for the platform's own commitment that personalization changes tone, never truth. |
| **Settings** | **Must Keep** | Baseline expectation of any product handling personal data and notification preferences; no justification needed beyond that. |

---

## Cross-Screen and Header Features

| Feature | Classification | Justification |
|---|---|---|
| **Notifications bell / unread badge** | **Must Keep, Improve** | Correct core mechanic; needs the transparency log (why did I get this) already scoped elsewhere before it can be fully trusted. |
| **Quick actions (⚡) button** | **Hide until justified** | Currently an unlabeled icon with no clear, discoverable purpose observed. A feature that cannot explain itself in one glance does not deserve permanent header real estate — hide it until its specific value is proven, then either promote it back with a clear label or remove it. |
| **Account menu ("G" avatar)** | **Improve** | Necessary long-term, but currently an unexplained single letter with no visible menu content confirmed — must be labeled and functional before real accounts exist, not after. |
| **Global search bar** ("Ask about a ticker, portfolio, or market event") | **Must Keep** | Correctly positioned as a universal entry point; genuinely useful once the underlying answers are trustworthy. |
| **Fixed quick-symbol shortcuts** (AAPL/MSFT/NVDA/AMZN/GOOGL/META/TSLA/PLTR, identical for every user) | **Improve** | A static, one-size-fits-all shortcut list contradicts the product's own personalization principle — should reflect the user's actual watchlist/portfolio once one exists, falling back to the current fixed list only for genuinely empty accounts. |
| **Market status indicator ("Market: Open")** | **Must Keep** | Small, honest, real-time context with no downside; nothing to improve. |

---

## Recommendations Screen Sub-Features

| Feature | Classification | Justification |
|---|---|---|
| **Confidence + Uncertainty dual score** | **Must Keep, extend everywhere** | Already correctly implemented here; the single highest-priority feature to extend to Daily Feed, Alerts, and Home, where it is currently absent. |
| **Explicit invalidation condition ("This would prove it wrong")** | **Must Keep, extend everywhere** | Same status as above — excellent where it exists, urgently needed elsewhere. |
| **Confidence drivers / reducers breakdown** | **Must Keep** | Genuine, specific transparency into why a score is what it is — exactly the kind of explanation this product should be known for. |
| **Bull / Base / Bear scenarios** | **Must Keep** | A sophisticated, well-designed feature that teaches probabilistic thinking rather than false certainty; a genuine differentiator. |
| **Quality score breakdown (6 components)** | **Must Keep** | Decomposed, specific, and honest — the opposite of a single opaque number. |
| **Committee debate (expert votes, consensus/disagreement)** | **Must Keep, keep collapsed and secondary** | Valuable as an optional, honest look at real disagreement — correctly never the primary verdict, and must stay that way structurally, not just by convention. |
| **"What changed" supersession history** | **Must Keep, surface more visibly** | Proves the platform's own immutability and change-tracking discipline; currently buried inside an expandable detail view, when it is exactly the kind of evidence that should be easier to find, not harder. |
| **"Show full evidence" expandable** | **Must Keep** | The single best-executed transparency mechanism in the product today; the standard every other screen's equivalent feature should be measured against. |

---

## Portfolio Screen Sub-Features

| Feature | Classification | Justification |
|---|---|---|
| **Portfolio Rules display** (position/sector limits, no leverage, no shorting, minimum confidence/risk-reward) | **Must Keep** | Genuine, specific transparency into the engine's own constraints — a real trust asset, cheap to maintain. |
| **Reset virtual portfolio (with confirmation)** | **Must Keep** | Correctly gated now; no further action needed beyond verifying the confirmation step works as intended. |
| **Trade History table (with Confidence, Thesis, Status columns)** | **Must Keep** | The right data model — every trade already intends to carry its own reasoning, not just its price. |
| **Performance Tracking (win rate, avg gain/loss, drawdown, benchmark)** | **Must Keep, Future-extend** | Already the right shape; should extend into the platform's honest, graded track record once the Outcome Engine is user-facing. |
| **Allocation by Sector / Asset Type** | **Improve** | Currently showing placeholder-style output; needs real, computed exposure before it can be trusted the way the Portfolio Rules display already is. |

---

## Not Yet Built — Future, Ranked by Urgency

| Feature | Urgency | Justification |
|---|---|---|
| **Real onboarding** | Immediate — precedes any "Future" ranking | Already Critical per `BETA_READINESS_AUDIT.md`; listed here only for completeness, not to imply it can wait. |
| **Visible, honest track-record / calibration screen** | Highest priority among genuinely new features | The single highest-leverage trust-building feature the product doesn't yet have anywhere a user can see it. |
| **Monthly Portfolio Review surface** | High | Already scoped in prior product planning; a natural extension of Portfolio's existing honest-reporting instinct. |
| **Family / Mentor Mode** | Medium-high | Serves the core underserved audience the whole strategy is built around, but reasonably sequenced after the trust and reachability foundations are solid. |
| **Referral mechanism (trust-triggered, never generic)** | Medium | Valuable, but only after there is a reliable trust moment to trigger it from. |
| **Notification transparency log** | Medium | Complements the Notifications bell improvement above. |
| **Public API / data export for advanced users** | Low | Real but niche value; correctly last in every prior prioritization exercise, and no reason to change that here. |

---

## Summary Discipline

This matrix is reviewed, not archived — a feature marked "Improve" that hasn't moved by the next review cycle is treated as a stalled decision, not a settled one. A feature is only ever added to "Must Keep" once it has actually earned that status through use, never on the strength of how interesting it was to design.
