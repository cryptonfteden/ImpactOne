import { describe, expect, it } from "vitest";
import {
  clamp,
  computeDiversification,
  computeRiskScore,
  riskLevelLabel,
  typePriorityCard,
  rankPriorityCards,
  sortMoversByChange,
} from "./dashboardMetrics";

describe("clamp", () => {
  it("bounds a value between min and max", () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe("computeDiversification", () => {
  it("returns full diversification for an empty portfolio", () => {
    const result = computeDiversification([]);
    expect(result.diversificationScore).toBe(100);
    expect(result.largestSector).toBeNull();
  });

  it("scores diversification as 100 minus the largest sector weight", () => {
    const result = computeDiversification([
      { name: "Technology", pct: 60 },
      { name: "Energy", pct: 25 },
      { name: "Healthcare", pct: 15 },
    ]);
    expect(result.largestSector).toBe("Technology");
    expect(result.largestWeightPct).toBe(60);
    expect(result.diversificationScore).toBe(40);
  });
});

describe("computeRiskScore", () => {
  it("is low for an all-cash, no-exposure portfolio", () => {
    const score = computeRiskScore({ positionsValue: 0, totalValue: 100000, largestSectorWeightPct: 0, macroRegime: null });
    expect(score).toBe(0);
  });

  it("rises with concentration beyond 25% in one sector", () => {
    const concentrated = computeRiskScore({ positionsValue: 100000, totalValue: 100000, largestSectorWeightPct: 90, macroRegime: null });
    const diversified = computeRiskScore({ positionsValue: 100000, totalValue: 100000, largestSectorWeightPct: 20, macroRegime: null });
    expect(concentrated).toBeGreaterThan(diversified);
  });

  it("rises when macro regime shows high recession risk and inflation pressure", () => {
    const calm = computeRiskScore({ positionsValue: 50000, totalValue: 100000, largestSectorWeightPct: 20, macroRegime: { recessionRisk: "low", inflationPressure: "low" } });
    const stressed = computeRiskScore({ positionsValue: 50000, totalValue: 100000, largestSectorWeightPct: 20, macroRegime: { recessionRisk: "high", inflationPressure: "high" } });
    expect(stressed).toBeGreaterThan(calm);
    expect(stressed - calm).toBe(25);
  });
});

describe("riskLevelLabel", () => {
  it("labels score bands correctly", () => {
    expect(riskLevelLabel(10)).toBe("Low");
    expect(riskLevelLabel(50)).toBe("Moderate");
    expect(riskLevelLabel(85)).toBe("High");
  });
});

describe("typePriorityCard", () => {
  it("types by impactType first", () => {
    expect(typePriorityCard({ impactType: "opportunity" })).toBe("opportunity");
    expect(typePriorityCard({ impactType: "risk" })).toBe("risk");
  });

  it("falls back to catalyst for company-event types", () => {
    expect(typePriorityCard({ impactType: "neutral", eventType: "earnings" })).toBe("catalyst");
  });

  it("defaults to alert otherwise", () => {
    expect(typePriorityCard({ impactType: "neutral", eventType: "macro" })).toBe("alert");
  });
});

describe("rankPriorityCards", () => {
  const feed = [
    { headline: "Fed rate hike", importanceScore: 60, impactType: "risk", eventType: "centralBanks", relatedTickers: [] },
    { headline: "NVDA AI demand acceleration", importanceScore: 55, impactType: "opportunity", eventType: "ai", relatedTickers: ["NVDA"] },
    { headline: "Minor sector rotation", importanceScore: 50, impactType: "neutral", eventType: "macro", relatedTickers: [] },
  ];
  const alerts = [{ headline: "Fed rate hike" }];
  const watchlist = ["NVDA"];

  it("boosts items that are already flagged as alerts", () => {
    const ranked = rankPriorityCards({ feed, alerts, watchlist }, 5);
    const fedCard = ranked.find((item) => item.headline === "Fed rate hike");
    expect(fedCard.cardType).toBe("alert");
    expect(fedCard.relevanceScore).toBe(75); // 60 + 15 alert boost
  });

  it("boosts items touching the watchlist", () => {
    const ranked = rankPriorityCards({ feed, alerts, watchlist }, 5);
    const nvdaCard = ranked.find((item) => item.headline === "NVDA AI demand acceleration");
    expect(nvdaCard.relevanceScore).toBe(65); // 55 + 10 watchlist boost
  });

  it("respects the limit and sorts by relevance descending", () => {
    const ranked = rankPriorityCards({ feed, alerts, watchlist }, 2);
    expect(ranked.length).toBe(2);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[1].relevanceScore);
  });
});

describe("sortMoversByChange", () => {
  it("sorts by absolute change descending and respects the limit", () => {
    const rows = [
      { symbol: "AAPL", change: 1.2 },
      { symbol: "TSLA", change: -5.4 },
      { symbol: "NVDA", change: 3.1 },
    ];
    const result = sortMoversByChange(rows, 2);
    expect(result.map((item) => item.symbol)).toEqual(["TSLA", "NVDA"]);
  });
});
