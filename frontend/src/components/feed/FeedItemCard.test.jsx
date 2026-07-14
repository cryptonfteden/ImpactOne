import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FeedItemCard from "./FeedItemCard";

const ITEM_FIXTURE = {
  headline: "NVDA announces new AI chip partnership",
  whyItMatters: "Expands NVDA's data-center AI compute footprint.",
  importanceScore: 82,
  confidence: 75,
  impactType: "opportunity",
  affectedSectors: ["Semiconductors", "Technology"],
  affectedAssets: ["NVDA", "TSM"],
  timeHorizon: "3-6 months",
  portfolioImpactPrediction: "Positive for AI infrastructure exposure.",
  sourceName: "Reuters",
  sourceUrl: "https://news.example.com/nvda",
  publishedAt: "2026-07-01T12:00:00.000Z",
  eventType: "ai",
  explainability: {
    reasoning: "Partnership expands compute supply meaningfully.",
    evidence: ["Contract disclosed in filing.", "Analyst estimates raised."],
    counterarguments: ["Deal terms not fully disclosed."],
    invalidationSignals: ["Partnership terminated or scaled back."],
  },
};

describe("FeedItemCard", () => {
  it("renders every required field", () => {
    render(<FeedItemCard item={ITEM_FIXTURE} />);

    expect(screen.getByText(ITEM_FIXTURE.headline)).toBeInTheDocument();
    expect(screen.getByText(ITEM_FIXTURE.whyItMatters)).toBeInTheDocument();
    expect(screen.getByText("Importance 82/100")).toBeInTheDocument();
    expect(screen.getByText("Confidence 75/100")).toBeInTheDocument();
    expect(screen.getByText(/Semiconductors, Technology/)).toBeInTheDocument();
    expect(screen.getByText(/NVDA, TSM/)).toBeInTheDocument();
    expect(screen.getByText(/Horizon: 3-6 months/)).toBeInTheDocument();
    expect(screen.getByText(/Positive for AI infrastructure exposure/)).toBeInTheDocument();
    expect(screen.getByText(/Reuters/)).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows the event's real explainability block as the reasoning trace, not a fabricated one", () => {
    render(<FeedItemCard item={ITEM_FIXTURE} />);

    expect(screen.getByText("Why this analysis")).toBeInTheDocument();
    expect(screen.getByText(ITEM_FIXTURE.explainability.reasoning)).toBeInTheDocument();
    expect(screen.getByText(/Deal terms not fully disclosed/)).toBeInTheDocument();
    expect(screen.getByText(/Partnership terminated or scaled back/)).toBeInTheDocument();
  });

  it("never shows a theme tag for an eventType outside the 7 tracked themes", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, eventType: "macro" }} />);
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("gracefully renders with a minimal item (no source, no explainability)", () => {
    render(<FeedItemCard item={{ headline: "Minimal event", whyItMatters: "Some reason." }} />);
    expect(screen.getByText("Minimal event")).toBeInTheDocument();
    expect(screen.queryByText("Why this analysis")).not.toBeInTheDocument();
  });
});
