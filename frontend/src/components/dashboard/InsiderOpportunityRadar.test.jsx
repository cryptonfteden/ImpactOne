import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import InsiderOpportunityRadar from "./InsiderOpportunityRadar";

function opportunity(symbol, { approved = false, activity = 60, committee = 70 } = {}) {
  return {
    symbol,
    company: `${symbol} Inc`,
    unusualActivity: { score: activity },
    insider: { totalValue: 250000, averagePrice: 25, distinctBuyers: 1 },
    dataQuality: { latestVerifiedPurchaseDate: "2026-08-20", filingsFetched: 1 },
    filingUrl: `https://www.sec.gov/Archives/${symbol}`,
    committee: {
      approved,
      score: committee,
      label: approved ? "BUY WATCH" : "REVIEW",
      coveragePct: 80,
      votes: { bullish: 4, neutral: 2, bearish: 1 },
    },
  };
}

describe("InsiderOpportunityRadar", () => {
  it("uses the same approved-first, activity-ranked shortlist as Mission Control", () => {
    render(<InsiderOpportunityRadar report={{ opportunities: [
      opportunity("REVIEW", { activity: 99 }),
      opportunity("SECOND", { approved: true, activity: 70 }),
      opportunity("FIRST", { approved: true, activity: 90 }),
    ] }} />);

    expect(screen.queryByText("REVIEW")).not.toBeInTheDocument();
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveTextContent("FIRST");
    expect(buttons[1]).toHaveTextContent("SECOND");
  });

  it("opens the selected verified symbol", () => {
    const onOpenTicker = vi.fn();
    render(<InsiderOpportunityRadar report={{ opportunities: [opportunity("AAPL", { approved: true })] }} onOpenTicker={onOpenTicker} />);
    fireEvent.click(screen.getByRole("button", { name: /AAPL/ }));
    expect(onOpenTicker).toHaveBeenCalledWith("AAPL");
  });

  it("exposes the verified SEC filing instead of hiding the evidence source", () => {
    render(<InsiderOpportunityRadar report={{ generatedAt: "2026-08-20T12:00:00Z", opportunities: [opportunity("SECX", { approved: true })] }} />);
    expect(screen.getByRole("link", { name: /Open verified SEC filing/ })).toHaveAttribute("href", "https://www.sec.gov/Archives/SECX");
    expect(screen.getByText(/SEC EDGAR/)).toBeInTheDocument();
  });
});
