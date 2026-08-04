import { describe, expect, it } from "vitest";
import {
  rankByScore,
  rankBySymbolAttention,
  prioritizeClaims,
  selectTopClaimByDirection,
  selectTopClaim,
  prioritizeClaimsByPortfolioImpact,
  detectContradiction,
  rankEvidenceByContribution,
  summarizeEvidence,
  recommendNextAction,
  buildClaimReasoningSections,
} from "./intelligenceEngine";

describe("intelligenceEngine — Phase PLATFORM-INTELLIGENCE-001", () => {
  describe("rankByScore", () => {
    it("sorts descending by the given score key", () => {
      const items = [{ id: "a", score: 40 }, { id: "b", score: 90 }, { id: "c", score: 60 }];
      expect(rankByScore(items, "score").map((i) => i.id)).toEqual(["b", "c", "a"]);
    });

    it("treats a missing score as lowest", () => {
      const items = [{ id: "a", score: 40 }, { id: "b" }, { id: "c", score: 60 }];
      expect(rankByScore(items, "score").map((i) => i.id)).toEqual(["c", "a", "b"]);
    });

    it("handles an empty/undefined list", () => {
      expect(rankByScore(undefined, "score")).toEqual([]);
      expect(rankByScore([], "score")).toEqual([]);
    });
  });

  describe("rankBySymbolAttention", () => {
    it("annotates each entity with the max real attentionScore among claims touching its symbol", () => {
      const entities = [{ symbol: "NVDA" }, { symbol: "META" }, { symbol: "XOM" }];
      const claims = [
        { symbols: ["NVDA"], attentionScore: 70 },
        { symbols: ["NVDA"], attentionScore: 90 },
        { symbols: ["META"], attentionScore: 40 },
      ];
      const result = rankBySymbolAttention(entities, claims, (e) => e.symbol);
      expect(result.map((e) => [e.symbol, e.attentionScore])).toEqual([
        ["NVDA", 90],
        ["META", 40],
        ["XOM", null],
      ]);
    });

    it("gives an entity with no touching claims a null attentionScore, sorted last", () => {
      const entities = [{ symbol: "XOM" }];
      const result = rankBySymbolAttention(entities, [], (e) => e.symbol);
      expect(result[0].attentionScore).toBeNull();
    });
  });

  describe("prioritizeClaims / selectTopClaimByDirection / selectTopClaim", () => {
    const claims = [
      { claimId: "c1", expectedDirection: "BEARISH", confidence: 70 },
      { claimId: "c2", expectedDirection: "BULLISH", confidence: 90 },
      { claimId: "c3", expectedDirection: "BEARISH", confidence: 85 },
    ];

    it("prioritizeClaims sorts by confidence descending", () => {
      expect(prioritizeClaims(claims).map((c) => c.claimId)).toEqual(["c2", "c3", "c1"]);
    });

    it("selectTopClaimByDirection returns the highest-confidence claim in that direction", () => {
      expect(selectTopClaimByDirection(claims, "BEARISH").claimId).toBe("c3");
      expect(selectTopClaimByDirection(claims, "BULLISH").claimId).toBe("c2");
    });

    it("selectTopClaimByDirection returns null when no claim matches", () => {
      expect(selectTopClaimByDirection(claims, "NEUTRAL")).toBeNull();
    });

    it("selectTopClaim returns the single highest-confidence claim regardless of direction", () => {
      expect(selectTopClaim(claims).claimId).toBe("c2");
    });

    it("selectTopClaim returns null for an empty list", () => {
      expect(selectTopClaim([])).toBeNull();
    });
  });

  describe("prioritizeClaimsByPortfolioImpact", () => {
    it("sorts by portfolio impact magnitude, then confidence, then urgency", () => {
      const claims = [
        { claimId: "low-impact", portfolioImpact: { magnitude: 20 }, confidence: 99 },
        { claimId: "high-impact-low-conf", portfolioImpact: { magnitude: 80 }, confidence: 40 },
        { claimId: "high-impact-high-conf", portfolioImpact: { magnitude: 80 }, confidence: 90 },
      ];
      const result = prioritizeClaimsByPortfolioImpact(claims);
      expect(result.map((c) => c.claimId)).toEqual(["high-impact-high-conf", "high-impact-low-conf", "low-impact"]);
    });

    it("breaks a magnitude+confidence tie by urgency (earlier expiresAt first)", () => {
      const claims = [
        { claimId: "later", portfolioImpact: { magnitude: 50 }, confidence: 50, expiresAt: "2026-12-01T00:00:00.000Z" },
        { claimId: "sooner", portfolioImpact: { magnitude: 50 }, confidence: 50, expiresAt: "2026-08-01T00:00:00.000Z" },
        { claimId: "no-expiry", portfolioImpact: { magnitude: 50 }, confidence: 50 },
      ];
      const result = prioritizeClaimsByPortfolioImpact(claims);
      expect(result.map((c) => c.claimId)).toEqual(["sooner", "later", "no-expiry"]);
    });
  });

  describe("detectContradiction", () => {
    it("reports no contradiction when counterEvidence is empty", () => {
      expect(detectContradiction({ evidence: [{ id: 1 }], counterEvidence: [] })).toEqual({ hasContradiction: false, supportingCount: 1, contradictingCount: 0 });
    });

    it("reports a contradiction when real counter-evidence exists", () => {
      expect(detectContradiction({ evidence: [{ id: 1 }], counterEvidence: [{ id: 2 }] })).toEqual({ hasContradiction: true, supportingCount: 1, contradictingCount: 1 });
    });

    it("handles a claim with neither field present", () => {
      expect(detectContradiction({})).toEqual({ hasContradiction: false, supportingCount: 0, contradictingCount: 0 });
    });
  });

  describe("rankEvidenceByContribution", () => {
    it("ranks by contributionToClaim when present", () => {
      const rows = [{ id: "a", contributionToClaim: 30 }, { id: "b", contributionToClaim: 90 }];
      expect(rankEvidenceByContribution(rows).map((r) => r.id)).toEqual(["b", "a"]);
    });

    it("falls back to confidence when contributionToClaim is missing", () => {
      const rows = [{ id: "a", confidence: 40 }, { id: "b", confidence: 80 }];
      expect(rankEvidenceByContribution(rows).map((r) => r.id)).toEqual(["b", "a"]);
    });

    it("respects a limit", () => {
      const rows = [{ id: "a", confidence: 10 }, { id: "b", confidence: 90 }, { id: "c", confidence: 50 }];
      expect(rankEvidenceByContribution(rows, { limit: 2 }).map((r) => r.id)).toEqual(["b", "c"]);
    });
  });

  describe("summarizeEvidence", () => {
    it("returns the fallback text when the list is empty", () => {
      expect(summarizeEvidence([], "No evidence.")).toBe("No evidence.");
      expect(summarizeEvidence(undefined, "No evidence.")).toBe("No evidence.");
    });

    it("joins the top-ranked entries' observed facts", () => {
      const rows = [
        { observedFact: "Fact A.", confidence: 90 },
        { observedFact: "Fact B.", confidence: 70 },
        { observedFact: "Fact C (dropped).", confidence: 10 },
      ];
      expect(summarizeEvidence(rows, "No evidence.", { limit: 2 })).toBe("Fact A. Fact B.");
    });
  });

  describe("recommendNextAction", () => {
    it("recommends reviewing risk when riskScore is elevated", () => {
      expect(recommendNextAction({ opportunityScore: 20, riskScore: 75 })).toBe("Review risk exposure — this symbol's risk score is elevated.");
    });

    it("recommends building a position when opportunityScore is elevated and risk is not", () => {
      expect(recommendNextAction({ opportunityScore: 80, riskScore: 30 })).toBe("Consider building or adding to this position.");
    });

    it("recommends monitoring when neither score is elevated", () => {
      expect(recommendNextAction({ opportunityScore: 40, riskScore: 40 })).toBe("No action needed — keep monitoring.");
    });

    it("derives opportunity/risk framing from a real Claim's confidence + expectedDirection when no explicit scores exist", () => {
      expect(recommendNextAction({ expectedDirection: "BEARISH", confidence: 80 })).toBe("Review risk exposure — this symbol's risk score is elevated.");
      expect(recommendNextAction({ expectedDirection: "BULLISH", confidence: 75 })).toBe("Consider building or adding to this position.");
      expect(recommendNextAction({ expectedDirection: "NEUTRAL", confidence: 95 })).toBe("No action needed — keep monitoring.");
    });
  });

  describe("buildClaimReasoningSections", () => {
    const claim = {
      plainLanguageStatement: "NVDA outlook improves.",
      reasoning: { observed: ["Fact one."], inferred: ["Conclusion one."] },
      evidence: [{ observedFact: "Supporting fact.", confidence: 90 }],
      counterEvidence: [{ observedFact: "Contradicting fact.", confidence: 80 }],
      invalidationConditions: ["Condition A."],
      confirmationConditions: ["Condition B."],
    };

    it("builds all six canonical sections in order with the default English labels", () => {
      const sections = buildClaimReasoningSections(claim);
      expect(sections.map((s) => s.label)).toEqual([
        "What is happening",
        "Why the platform believes it",
        "Evidence that supports it",
        "Evidence that contradicts it",
        "What could invalidate this thesis",
        "What to monitor next",
      ]);
      expect(sections[0].content).toBe("NVDA outlook improves.");
      expect(sections[1].content).toBe("Fact one. Inferred: Conclusion one.");
      expect(sections[2].content).toBe("Supporting fact.");
      expect(sections[3].content).toBe("Contradicting fact.");
      expect(sections[4].content).toBe("Condition A.");
      expect(sections[5].content).toBe("Condition B.");
    });

    it("supports overriding labels (e.g. for i18n-translated consumers) while keeping the same content logic", () => {
      const sections = buildClaimReasoningSections(claim, { labels: { whatIsHappening: "Pourquoi" } });
      expect(sections[0].label).toBe("Pourquoi");
      expect(sections[0].content).toBe("NVDA outlook improves.");
    });

    it("returns honest fallback content for every section when the claim has nothing recorded", () => {
      const sections = buildClaimReasoningSections({});
      expect(sections[1].content).toBe("No detailed reasoning trace recorded for this Claim yet.");
      expect(sections[2].content).toBe("No supporting evidence recorded yet.");
      expect(sections[3].content).toBe("No contradicting evidence recorded — this thesis is currently uncontested.");
      expect(sections[4].content).toBe("No invalidation conditions recorded for this Claim yet.");
      expect(sections[5].content).toBe("No specific confirmation conditions recorded for this Claim yet.");
    });
  });
});
