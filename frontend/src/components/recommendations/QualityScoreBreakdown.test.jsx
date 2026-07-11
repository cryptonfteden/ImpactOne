import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import QualityScoreBreakdown from "./QualityScoreBreakdown";

const COMPONENTS_FIXTURE = {
  sourceQuality: 95,
  evidenceFreshness: 80,
  portfolioRelevance: 100,
  evidenceAgreement: 100,
  dataCompleteness: 100,
  modelConfidence: 88,
};

describe("QualityScoreBreakdown", () => {
  it("renders all six named components with their scores", () => {
    render(<QualityScoreBreakdown qualityComponents={COMPONENTS_FIXTURE} />);

    expect(screen.getByText("Source quality")).toBeInTheDocument();
    expect(screen.getByText("95/100")).toBeInTheDocument();
    expect(screen.getByText("Evidence freshness")).toBeInTheDocument();
    expect(screen.getByText("80/100")).toBeInTheDocument();
    expect(screen.getByText("Portfolio relevance")).toBeInTheDocument();
    expect(screen.getByText("Evidence agreement")).toBeInTheDocument();
    expect(screen.getByText("Data completeness")).toBeInTheDocument();
    expect(screen.getByText("Model confidence")).toBeInTheDocument();
    expect(screen.getByText("88/100")).toBeInTheDocument();
  });

  it("renders nothing when qualityComponents is absent", () => {
    const { container } = render(<QualityScoreBreakdown qualityComponents={null} />);
    expect(container.firstChild).toBeNull();
  });
});
