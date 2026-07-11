import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RecommendationsPreview from "./RecommendationsPreview";

const RECOMMENDATION_FIXTURE = {
  id: "rec-1",
  symbol: "NVDA",
  action: "BUY",
  confidenceScore: 88,
  riskLabel: "Moderate",
  expectedUpside: "10-16%",
  expectedDownside: "-8% tactical stop",
};

describe("RecommendationsPreview", () => {
  it("renders up to 3 recommendations with action, confidence, and upside/downside", () => {
    render(<RecommendationsPreview isLoading={false} error="" recommendations={[RECOMMENDATION_FIXTURE]} onViewAll={vi.fn()} />);

    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText(/Confidence 88\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Upside 10-16%/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no active recommendations", () => {
    render(<RecommendationsPreview isLoading={false} error="" recommendations={[]} onViewAll={vi.fn()} />);
    expect(screen.getByText(/No active recommendations/)).toBeInTheDocument();
  });

  it("calls onViewAll when the view-all button is clicked", () => {
    const onViewAll = vi.fn();
    render(<RecommendationsPreview isLoading={false} error="" recommendations={[RECOMMENDATION_FIXTURE]} onViewAll={onViewAll} />);

    fireEvent.click(screen.getByRole("button", { name: "View all recommendations" }));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it("never renders a place-order control", () => {
    render(<RecommendationsPreview isLoading={false} error="" recommendations={[RECOMMENDATION_FIXTURE]} onViewAll={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /place order/i })).not.toBeInTheDocument();
  });
});
