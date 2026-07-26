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
    // Phase E3.5 — whyItMatters now renders alongside a "{headline}:" lead-in
    // (real presentation change, same underlying real text) rather than as
    // its own isolated text node, so this matches the real rendered content
    // via a partial/regex query instead of an exact full-string match.
    expect(screen.getByText(/Expands NVDA's data-center AI compute footprint/)).toBeInTheDocument();
    expect(screen.getByText("Importance 82/100")).toBeInTheDocument();
    expect(screen.getByText("Confidence 75/100")).toBeInTheDocument();
    expect(screen.getByText(/Semiconductors, Technology/)).toBeInTheDocument();
    // "NVDA, TSM" honestly appears both in the Why-do-I-care affected
    // assets line and again in the expandable evidence/detail block.
    expect(screen.getAllByText(/NVDA, TSM/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Horizon: 3-6 months/)).toBeInTheDocument();
    expect(screen.getByText(/Positive for AI infrastructure exposure/)).toBeInTheDocument();
    expect(screen.getByText(/Reuters/)).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows the event's real explainability block as the reasoning trace, not a fabricated one", () => {
    render(<FeedItemCard item={ITEM_FIXTURE} />);

    expect(screen.getByText("Evidence, reasoning & portfolio impact")).toBeInTheDocument();
    expect(screen.getByText(ITEM_FIXTURE.explainability.reasoning)).toBeInTheDocument();
    expect(screen.getByText(/Deal terms not fully disclosed/)).toBeInTheDocument();
    expect(screen.getByText(/Partnership terminated or scaled back/)).toBeInTheDocument();
  });

  it("never shows a theme tag for an eventType outside the 7 tracked themes", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, eventType: "macro" }} />);
    expect(screen.queryByText("AI")).not.toBeInTheDocument();
  });

  it("Phase E3.5 — strips the reasoning engine's redundant repeated-headline lead-in so near-identical template text doesn't read as a duplicate of the card's own title", () => {
    render(
      <FeedItemCard
        item={{
          headline: "Fed rate hike",
          whyItMatters: '"Fed rate hike" is being weighed against Financials and Rate-Sensitive Growth exposure; most comparable to "Rate Hikes" (88% historical similarity).',
        }}
      />
    );
    expect(screen.getByText(/Financials and Rate-Sensitive Growth exposure/)).toBeInTheDocument();
    // The redundant quoted repeat of the headline must not appear a second
    // time inside the explanation paragraph itself (it's already the card's
    // own <h4> title) — real text, just not duplicated.
    expect(screen.queryByText(/"Fed rate hike" is being weighed against/)).not.toBeInTheDocument();
  });

  it("gracefully renders with a minimal item (no source, no explainability)", () => {
    render(<FeedItemCard item={{ headline: "Minimal event", whyItMatters: "Some reason." }} />);
    expect(screen.getByText("Minimal event")).toBeInTheDocument();
    expect(screen.queryByText("Evidence, reasoning & portfolio impact")).not.toBeInTheDocument();
  });

  it("Sprint 40 — shows a real relative-freshness badge and an honest read-time estimate, not just a raw timestamp", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, publishedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() }} />);
    expect(screen.getByText("30m ago")).toBeInTheDocument();
    expect(screen.getByText(/min read/)).toBeInTheDocument();
  });

  it("Sprint 40 — a high-confidence opportunity/risk item is marked 'Act now'", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, impactType: "opportunity", confidence: 85 }} />);
    expect(screen.getByText("Act now")).toBeInTheDocument();
  });

  it("Sprint 40 — a low-confidence directional item is marked 'Monitor', never overclaimed as actionable", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, impactType: "risk", confidence: 40 }} />);
    expect(screen.getByText("Monitor")).toBeInTheDocument();
  });

  it("Sprint 40 — a neutral item is marked 'FYI', never presented as something to act on", () => {
    render(<FeedItemCard item={{ ...ITEM_FIXTURE, impactType: "neutral", confidence: 90 }} />);
    expect(screen.getByText("FYI")).toBeInTheDocument();
  });

  describe("Phase UI-INTEGRATION-001 — Changed Claims", () => {
    it("honestly shows 'No active Claims affected.' when there are no claims at all", () => {
      render(<FeedItemCard item={ITEM_FIXTURE} activeClaims={[]} />);
      expect(screen.getByText("No active Claims affected.")).toBeInTheDocument();
    });

    it("honestly shows 'No active Claims affected.' when claims exist but none share this item's symbols", () => {
      render(<FeedItemCard item={ITEM_FIXTURE} activeClaims={[{ claimId: "c1", status: "ACTIVE", symbols: ["MSFT"], statement: "MSFT claim" }]} />);
      expect(screen.getByText("No active Claims affected.")).toBeInTheDocument();
    });

    it("shows 'strengthened' only when a real overlapping claim transitioned within the recent window", () => {
      render(
        <FeedItemCard
          item={ITEM_FIXTURE}
          activeClaims={[
            { claimId: "c1", status: "STRENGTHENING", symbols: ["NVDA"], plainLanguageStatement: "NVDA is strengthening", lastUpdatedAt: "2026-07-01T18:00:00.000Z" },
          ]}
        />
      );
      expect(screen.getByText(/This news strengthened a Claim: "NVDA is strengthening"/)).toBeInTheDocument();
    });

    it("never claims a causal transition when the overlapping claim's last update is far from the item's publish time", () => {
      render(
        <FeedItemCard
          item={ITEM_FIXTURE}
          activeClaims={[
            { claimId: "c1", status: "STRENGTHENING", symbols: ["NVDA"], plainLanguageStatement: "NVDA older claim", lastUpdatedAt: "2026-01-01T00:00:00.000Z" },
          ]}
        />
      );
      expect(screen.getByText(/relates to an active Claim: "NVDA older claim"/)).toBeInTheDocument();
      expect(screen.queryByText(/This news strengthened/)).not.toBeInTheDocument();
    });

    it("shows 'invalidated' for a real recently-invalidated overlapping claim", () => {
      render(
        <FeedItemCard
          item={ITEM_FIXTURE}
          activeClaims={[
            { claimId: "c1", status: "INVALIDATED", symbols: ["TSM"], plainLanguageStatement: "TSM claim invalidated", lastUpdatedAt: "2026-07-01T13:00:00.000Z" },
          ]}
        />
      );
      expect(screen.getByText(/This news invalidated a Claim: "TSM claim invalidated"/)).toBeInTheDocument();
    });
  });

  describe("Phase PRODUCT-001 — 'why do I care?'", () => {
    it("shows the real attention score, affected holdings, and portfolio relevance for a held-symbol item", () => {
      render(<FeedItemCard item={{ ...ITEM_FIXTURE, isHeld: true, attentionScore: 78 }} activeClaims={[]} />);
      expect(screen.getByText("Attention score: 78/100.")).toBeInTheDocument();
      expect(screen.getByText("Affected holdings: NVDA, TSM.")).toBeInTheDocument();
      expect(screen.getByText("Portfolio relevance: directly relevant to your portfolio.")).toBeInTheDocument();
    });

    it("honestly shows 'not directly relevant' portfolio relevance when the item's assets aren't held", () => {
      render(<FeedItemCard item={{ ...ITEM_FIXTURE, isHeld: false, attentionScore: 40 }} activeClaims={[]} />);
      expect(screen.getByText("Portfolio relevance: not directly relevant to your portfolio.")).toBeInTheDocument();
      expect(screen.getByText(/Affected assets \(not currently held\): NVDA, TSM/)).toBeInTheDocument();
    });

    it("shows the honest 'No meaningful impact detected.' when an item has no affected assets, isn't held, and overlaps no claim", () => {
      render(<FeedItemCard item={{ headline: "Generic macro note", whyItMatters: "General context." }} activeClaims={[]} />);
      expect(screen.getByText("No meaningful impact detected.")).toBeInTheDocument();
      expect(screen.queryByText("No active Claims affected.")).not.toBeInTheDocument();
    });
  });
});
