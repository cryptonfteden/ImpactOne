import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ScenarioComparison from "./ScenarioComparison";

const SCENARIOS_FIXTURE = [
  { case: "bull", narrative: "AI capex accelerates.", probability: 0.3, priceImpact: "15-22%", portfolioImpact: "+1.8% of total portfolio value (approx.)", catalysts: ["AI capex supercycle"], risks: [], invalidationTrigger: "Supporting data fails to confirm the first-order move." },
  { case: "base", narrative: "Leadership stays concentrated.", probability: 0.5, priceImpact: "4-9%", portfolioImpact: null, catalysts: ["Mixed market impact expected."], risks: ["Valuation stretched"], invalidationTrigger: "Sector leadership rotates away from affected assets." },
  { case: "bear", narrative: "Valuation de-rating.", probability: 0.2, priceImpact: "-8% tactical stop", portfolioImpact: null, catalysts: ["Valuation stretched"], risks: ["Valuation stretched"], invalidationTrigger: "Sector leadership rotates away from affected assets." },
];

describe("ScenarioComparison", () => {
  it("renders all three cases with narrative, probability, and price impact", () => {
    render(<ScenarioComparison scenarios={SCENARIOS_FIXTURE} />);

    expect(screen.getByText("Bull")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByText("Bear")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("AI capex accelerates.")).toBeInTheDocument();
  });

  it("shows the portfolio impact approximation when present", () => {
    render(<ScenarioComparison scenarios={SCENARIOS_FIXTURE} />);
    expect(screen.getByText(/1\.8% of total portfolio value/)).toBeInTheDocument();
  });

  it("renders nothing when there are no scenarios", () => {
    const { container } = render(<ScenarioComparison scenarios={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
