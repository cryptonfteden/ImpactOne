import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WeeklyFibonacciRadar from "./WeeklyFibonacciRadar";

function candidate(symbol, approved) {
  return {
    symbol,
    weekly: { status: "APPROACHING 0.886", signalEligible: approved, currentPrice: 101, targetPrice: 100, distancePct: 1 },
    committee: { approved, score: approved ? 82 : 76, label: approved ? "ENTRY WATCH" : "TECHNICAL REVIEW", coveragePct: 71, votes: { bullish: 4, neutral: 3, bearish: 1 } },
  };
}

describe("WeeklyFibonacciRadar", () => {
  it("never presents a committee-rejected research candidate as a recommendation", () => {
    render(<WeeklyFibonacciRadar report={{ opportunities: [candidate("REJECT", false)], approvedOpportunities: [], coverage: { configuredUniverse: 5259, scanned: 120, remaining: 5139, progressPct: 2.3, rejectedByCommittee: 1 } }} />);
    expect(screen.queryByText("REJECT")).not.toBeInTheDocument();
    expect(screen.getByText(/No approved stock/)).toBeInTheDocument();
    expect(screen.getByText(/remaining 5139 stocks/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2.3");
  });

  it("renders and opens only approved setups", () => {
    const onOpenTicker = vi.fn();
    render(<WeeklyFibonacciRadar report={{ opportunities: [candidate("NOPE", false), candidate("PASS", true)], approvedOpportunities: [candidate("PASS", true)], coverage: { scanned: 160, approved: 1, rejectedByCommittee: 1 } }} onOpenTicker={onOpenTicker} />);
    expect(screen.queryByText("NOPE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /PASS/ }));
    expect(onOpenTicker).toHaveBeenCalledWith("PASS");
  });

  it("defensively hides stale approvals that fail the strategy gate", () => {
    const stale = candidate("STALE", true);
    stale.weekly.signalEligible = false;
    stale.committee.blockers = ["Prior weekly close crossed below 0.886."];
    render(<WeeklyFibonacciRadar report={{ approvedOpportunities: [stale], coverage: { scanned: 20, remaining: 0 } }} />);
    expect(screen.queryByText("STALE")).not.toBeInTheDocument();
    expect(screen.getByText(/No approved stock/)).toBeInTheDocument();
  });
});
