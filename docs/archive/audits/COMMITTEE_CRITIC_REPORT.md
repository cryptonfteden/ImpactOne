# Committee Critic Report
## Sprint 38 — Investment Committee Red Team

**Method:** A live, evidence-only walkthrough of the Recommendations screen's "Show full evidence" detail view, comparing the Committee debate section across multiple different tickers (TSLA, NVDA) side by side. No code was reviewed for this report — every finding below is a direct read of what the product actually shows a user today.

---

## A Scope Correction, Stated Up Front

The mission described "eight genuinely independent experts." The committee actually observed, on every recommendation where it appears at all, has **five** named members: Macro Strategist, Equity Analyst, Technical Analyst, Alternative Data Analyst, and Risk Manager. There is no sixth, seventh, or eighth voice visible anywhere in the product. This gap between the assumed size and the observed size is itself worth noting before any independence question can be answered — a user or reviewer expecting eight opinions is getting five, unlabeled as such.

---

## 1. Independence Audit

**Headline finding: the same five-vote pattern appears, in the same order, with the same vote labels, on two completely different companies.**

| Specialist | TSLA (vote / confidence) | NVDA (vote / confidence) |
|---|---|---|
| Macro Strategist | Reduce / 75 | Reduce / 66 |
| Equity Analyst | Hold / 62 | Hold / 52 |
| Technical Analyst | Hold / 51 | Hold / 53 |
| Alternative Data Analyst | Hold / 75 | Hold / 66 |
| Risk Manager | Reduce / 64 | Reduce / 54 |
| **Consensus / Disagreement** | **60% / 40%** | **60% / 40%** |

Two observations here are decisive, not merely suggestive:

1. **The Macro Strategist's confidence number and the Alternative Data Analyst's confidence number are exactly identical in both cases** — 75/75 for TSLA, 66/66 for NVDA. Two specialists with supposedly different domains of expertise (macro conditions vs. alternative data signals) producing byte-identical confidence scores, twice, on two unrelated companies, is not a coincidence a genuinely independent reasoning process would produce. This is the clearest, most reproducible evidence of a shared underlying number being relabeled with two different job titles, rather than two independent analyses.
2. **The Consensus/Disagreement split is the identical 60%/40% on both tickers.** A genuinely independent five-way vote, applied to two different companies with different evidence, would not be expected to land on the exact same aggregate split every time. This reads as a formula applied consistently to a similarly-shaped input, not five independent minds actually reasoning about TSLA versus NVDA specifically.

**No individual rationale or argument text is shown for any committee member** — only a vote label and a number. This means the most direct form of "copy-paste arguments" (identical sentences) cannot even be checked, because no sentences are shown at all. That absence is itself a finding: a user cannot tell *why* the Macro Strategist voted Reduce, only that they did, at a number that happens to exactly match a different specialist's number.

---

## 2. Disagreement Quality

The committee does show genuine directional variety in its **labels** — a mix of Reduce and Hold, never a unanimous vote in either observed case. This is real and worth crediting. But the *quality* of that disagreement is shallow: with no visible reasoning behind any single vote, a user cannot tell whether the Technical Analyst's "Hold" reflects weak technicals genuinely offsetting a stronger macro case, or whether it's simply a different number drawn from the same well as everything else on the card. The scenario this review was asked to test — strong macro against weak technicals, bullish options against bearish research — cannot be verified as actually modeled, because no per-domain evidence is shown feeding each vote. **Disagreement is visible in label, but not demonstrated in substance.**

---

## 3. False Consensus

The identical 60%/40% consensus split across two unrelated companies is the single strongest piece of evidence this review found for false, mechanical consensus rather than genuine diversity. If five independent specialists were actually reasoning about TSLA and NVDA on their own merits, an identical aggregate split twice in a row would be a remarkable coincidence. The far more likely explanation, based on what's observable, is that the "committee" is a small number of underlying signals (plausibly two or three) mapped onto five labeled personas, producing the appearance of five independent opinions from what is closer to two.

---

## 4. CIO Review — Summarizing or Silently Overriding?

**This is the most serious finding in this report.** In both observed cases, all five committee members voted **Reduce or Hold — zero Buy votes, from any of the five — yet the headline recommendation shown to the user, in large type at the top of the same card, is "Buy."** No visible synthesis, executive summary, or CIO-style reconciliation was found anywhere in the expanded detail view explaining this gap. A user reading only the top line sees "Buy." A user who reads carefully to the bottom of the same card sees five specialists who, between them, never once said "Buy." Nothing in the product currently bridges that gap in front of the user. This is not proof the CIO layer is inventing reasoning — no fabricated justification was observed — but it is proof that if a reconciling explanation exists, it is not being shown, which is nearly as serious a transparency failure for a feature whose entire value proposition is showing the user *why*.

---

## 5. User Experience

**Reading one of these recommendations end to end feels like "AI gave me a score," not "I just listened to eight investment professionals."** Three specific reasons: first, no specialist's reasoning is ever shown in their own words — a name, a one-word vote, and a number is not what listening to a professional feels like. Second, the identical cross-ticker pattern found in §1 means that even a moderately attentive user comparing two recommendations side by side (as this review did) would notice the repetition. Third, and most damaging, the committee's own collective lean (cautious, Reduce/Hold) contradicts the confident "Buy" headline with no visible explanation — which does not read as a panel of experts informing a decision; it reads as a decision that was made regardless of what the panel said.

---

## 6. Future Value

- **Adds the most value next:** The **Equity Analyst** persona — company-specific fundamental reasoning is the single most differentiable domain across tickers, and the one most likely to genuinely diverge between, say, TSLA and NVDA if it were actually computed independently per company. Making this specialist's reasoning visible, in its own words, tied to company-specific facts, would do the most to convert this feature from "a score" into "a professional's opinion."
- **Should stay internal (not user-facing) for now:** The **Alternative Data Analyst** — given it currently produces a confidence number identical to the Macro Strategist's in both observed cases, showing it to users today actively misrepresents it as a distinct, independent voice when the evidence suggests it isn't yet one.
- **Users never need to see directly:** The raw **Consensus/Disagreement percentage** in its current form. As a single, formula-like number that has now been observed to be identical across two unrelated companies, showing it to users lends false precision to what looks like a shared calculation, not a genuinely tallied vote.
