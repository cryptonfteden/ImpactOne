import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntelligenceCard from "./IntelligenceCard";

const CLAIM = {
  claimId: "c1",
  symbols: ["NVDA"],
  expectedDirection: "BULLISH",
  confidence: 82,
  probability: 65,
  status: "STRENGTHENING",
  statement: "NVDA statement.",
  plainLanguageStatement: "NVDA plain language.",
  evidence: [{ id: "e1", observedFact: "Real evidence." }],
  counterEvidence: [{ id: "e2", observedFact: "Real counter-evidence." }],
  portfolioImpact: { magnitude: 70, direction: "positive" },
};

describe("IntelligenceCard — the canonical Claim card (Biggest Risk / Best Opportunity / Why This Affects You)", () => {
  it("renders the default body: Confidence, direction, symbols, statement, and the strongest evidence line", () => {
    render(<IntelligenceCard title="Biggest Risk" claim={CLAIM} />);
    expect(screen.getByText("Biggest Risk")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Confidence 82 out of 100/ })).toBeInTheDocument();
    expect(screen.getByText("BULLISH")).toBeInTheDocument();
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("NVDA plain language.")).toBeInTheDocument();
    expect(screen.getByText("Real evidence.")).toBeInTheDocument();
  });

  it("never shows Probability, a status badge, or counter-evidence unless explicitly requested", () => {
    render(<IntelligenceCard title="x" claim={CLAIM} />);
    expect(screen.queryByRole("img", { name: /Probability/ })).not.toBeInTheDocument();
    expect(screen.queryByText("STRENGTHENING")).not.toBeInTheDocument();
    expect(screen.queryByText("Real counter-evidence.")).not.toBeInTheDocument();
  });

  it("shows Probability as a separate MetricArc when requested, never merged with Confidence", () => {
    render(<IntelligenceCard title="x" claim={CLAIM} showProbability />);
    expect(screen.getByRole("img", { name: /Confidence 82 out of 100/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Probability 65 percent" })).toBeInTheDocument();
  });

  it("shows the real status badge when requested", () => {
    render(<IntelligenceCard title="x" claim={CLAIM} showStatusBadge />);
    expect(screen.getByText("STRENGTHENING")).toBeInTheDocument();
  });

  it("renders explicitly-labeled sections instead of the default body when `sections` is given", () => {
    render(
      <IntelligenceCard
        eyebrow="NVDA"
        claim={CLAIM}
        sections={[
          { label: "Why", content: "Custom why text." },
          { label: "Evidence", content: "Custom evidence text." },
        ]}
      />
    );
    expect(screen.getByText(/Custom why text\./)).toBeInTheDocument();
    expect(screen.getByText(/Custom evidence text\./)).toBeInTheDocument();
    // The default terse body must not also render.
    expect(screen.queryByText("NVDA plain language.")).not.toBeInTheDocument();
  });

  it("shows the expand toggle only when `expandable` is set, and reveals real expandableContent only when expanded", () => {
    render(
      <IntelligenceCard
        title="Biggest Risk"
        claim={CLAIM}
        expandable
        expandableContent={<p>Portfolio impact: 70/100 (positive)</p>}
      />
    );
    expect(screen.queryByText("Portfolio impact: 70/100 (positive)")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Show more"));
    expect(screen.getByText("Portfolio impact: 70/100 (positive)")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Show less"));
    expect(screen.queryByText("Portfolio impact: 70/100 (positive)")).not.toBeInTheDocument();
  });

  it("renders no expand toggle at all when `expandable` is not set", () => {
    render(<IntelligenceCard title="x" claim={CLAIM} />);
    expect(screen.queryByText("Show more")).not.toBeInTheDocument();
  });
});
