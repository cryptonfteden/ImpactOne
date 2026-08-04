# Explainability Critic Report
## Sprint 39 — Explainability Red Team

**Posture:** A skeptical investor, not a reviewer. Every finding below is something directly observed — either in this session's live walkthrough, or in the immediately preceding review session's first-hand documentation of the same product version, on the same recommendations. **A note on conditions:** partway through this session, the backend genuinely went offline (confirmed by a direct port check, not assumed — `net::ERR_CONNECTION_REFUSED` on multiple live requests). Both the live and the degraded states are reported honestly, separately, and never blended into one narrative.

---

## 1. Traceability Test

Attempting to trace a recommendation for TSLA, step by step, using the platform's own detail view:

**Recommendation → CIO:** The headline verdict ("Buy") is shown with no visible synthesis statement connecting it to the five committee votes shown further down the same card. **The chain breaks here.** There is no CIO-authored paragraph anywhere in the product explaining why the final action is "Buy" specifically.

**CIO → Committee:** Cannot be traced, because no CIO statement exists to trace from. The five committee votes (Macro Strategist: Reduce, Equity Analyst: Hold, Technical Analyst: Hold, Alternative Data Analyst: Hold, Risk Manager: Reduce) are shown as a flat list with no stated relationship to the final verdict above them. **The chain breaks here a second time**, independently of the first break.

**Committee → Evidence:** Cannot be traced. No committee member's vote is linked to a specific piece of supporting or contradicting evidence — a vote and a confidence number are shown with no visible "because of X" reasoning attached.

**Evidence → Original source:** Partially traceable at best. The card's "Supporting evidence" list names specific events (e.g., "AI infrastructure demand remains strong") with a one-line description, but only one of every roughly thirty items reviewed across this and the prior session carried an actual clickable source link. **The chain breaks here for the overwhelming majority of evidence cited.**

**Where the chain holds:** The "Why now" and "What changed" sections are genuinely well-traced — each carries a real generation timestamp, and "What changed" shows a dated, append-only history of confidence movements. This part of the chain is a real strength.

**A live, unplanned confirmation of chain fragility:** During this session, the backend genuinely went offline mid-review. On the AI Analysis screen, the chain-break was disclosed honestly, stage by stage ("The AI report will appear here once the analysis completes," "Alternative data feeds are temporarily unavailable," "Intelligence engine is temporarily unavailable," "Investment committee is temporarily unavailable"). **On the Recommendations screen, the same outage produced no message at all** — only an empty header with zero content and zero explanation. The same failure, disclosed honestly on one screen and silently on another, is itself a traceability defect: a user has no way to know, on the Recommendations screen, whether "nothing is here" means "no recommendations today" or "something broke."

---

## 2. Contradiction Test

| Pattern searched for | Found? | Evidence |
|---|---|---|
| Committee says Hold/Reduce, Recommendation says Buy | **Yes — confirmed twice, on two different tickers** | TSLA and NVDA recommendations both show all five committee members voting Reduce or Hold (zero Buy votes from any member) while the headline verdict on the same card reads "Buy," with no reconciling statement anywhere. |
| Counter-evidence stronger than supporting evidence | Not directly measurable — no relative-strength comparison between supporting and counter items is shown; both are listed as flat, unweighted text. | This is itself a defect: without a visible strength comparison, a user cannot tell whether the counter-evidence was seriously weighed or an afterthought. |
| Low confidence presented confidently | **Yes, one clear instance** | During the live outage, AI Analysis showed a "Recommendation" card stating a definitive "Hold" label while, in the same breath, admitting "Recommendation data is being loaded" — a firm-sounding label paired with an explicit admission the underlying data isn't ready. |
| Missing evidence hidden | **Yes** | No section anywhere states "we don't have data on X" for a specific recommendation. A "Data completeness: 100/100" score is shown with no explanation of what it is completeness *relative to* — a number presented as reassuring without disclosing what could have been missing. |

---

## 3. Explanation Quality

| Question | Answered? | Basis |
|---|---|---|
| Why? | **Yes** | "Why now" and "Supporting evidence" directly address this, with real timestamps. |
| Why not? | **Partially** | "Key risks" exists but is often a single generic line ("Elevated inflation pressure") repeated verbatim across unrelated tickers, rather than a specific counter-case. |
| What changed? | **Yes, well** | The "What changed" supersession history is genuinely strong — dated, specific, append-only. |
| What would invalidate this? | **Yes** | An explicit "Would prove it wrong" section exists on every recommendation reviewed — a real strength. |
| What evidence is missing? | **No — unanswered everywhere reviewed.** | This is a defect on every recommendation checked. |
| What is uncertain? | **Partially** | An uncertainty score is shown, but without narrative context explaining what specifically is contested — "Confidence drivers/reducers" sometimes just states "No material confidence reducers detected this run," which is honest but not illuminating. |

**Two of six questions go fully unanswered or under-answered on every recommendation reviewed. By this review's own standard, that is two confirmed defects before any single-recommendation deep dive even begins.**

---

## 4. User Test — "I'm About to Invest Real Money"

Reading the TSLA "Buy" recommendation end to end, as a real prospective investor:

- **Would I trust it?** Not fully. The moment I notice that every committee member voted Reduce or Hold while the card tells me to Buy, with nothing explaining the gap, my trust in the headline verdict drops sharply — and once I've read that far, I can't un-notice it.
- **Would I understand it?** Mostly yes. The layout, labels, and plain-language framing are genuinely well-designed and easy to follow at a surface level.
- **Would I know what could prove it wrong?** Yes — this is a real, working strength. The invalidation condition is explicit and specific.
- **Would I know what information is missing?** No. Nothing on the card tells me what wasn't checked, what data was thin, or what a more complete analysis might have included. I would leave this recommendation assuming it was based on everything relevant, with no way to know if that's true.

---

## 5. Transparency Test

- **Hidden assumptions:** The bull/base/bear scenario split (e.g., 30%/50%/20%) is shown with no stated methodology for how those specific probabilities were derived.
- **Hidden weighting:** The six-component "Quality score breakdown" (source quality, evidence freshness, portfolio relevance, evidence agreement, data completeness, model confidence) shows six numbers with no visible statement of how they combine into the single quality score shown elsewhere on the same card.
- **Hidden AI reasoning:** The "historical similarity" percentage (e.g., "88% historical similarity" to a named past event) is stated with no explanation of what is being compared or how similarity is calculated — a specific-sounding number with an invisible method behind it.
- **Fake precision:** The same historical-similarity percentage is a strong candidate — an 88% figure implies a level of rigor that is never demonstrated anywhere the user can check.
- **Missing timestamps:** Inconsistent. "Why now" and "What changed" carry real, specific timestamps — a genuine strength. Analyst-consensus and alternative-data-style figures observed elsewhere in the product (in prior review sessions) carried no equivalent freshness label at all.

---

## Summary

The parts of this product that explain themselves well — invalidation conditions, dated change history, plain-language framing — are genuinely strong and worth preserving exactly as they are. But the chain a skeptical investor actually needs to follow — from a confident headline verdict, through a committee that supposedly informed it, through evidence that supposedly grounds it, to a source that could be independently checked — breaks at multiple, specific, reproducible points. A product that can show you what would prove it wrong but cannot show you why it disagreed with its own committee has not yet earned the full trust its best individual features deserve.
