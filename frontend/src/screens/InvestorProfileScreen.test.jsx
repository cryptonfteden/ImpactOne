import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import InvestorProfileScreen from "./InvestorProfileScreen";
import { investorProfileApi } from "../services/api";

vi.mock("../services/api", () => ({
  investorProfileApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getInvestmentProfile: vi.fn(),
  },
}));

const PROFILE_FIXTURE = { id: "p1", age: 25, country: "US", monthlyInvestmentAmount: 500 };
const INVESTMENT_PROFILE_FIXTURE = {
  suggestedAllocation: { stocks: 75, bonds: 18, cash: 7 },
  diversificationExplanation: "Spread across stocks, bonds, and cash so no single move sinks the plan.",
  expectedVolatility: { lowPct: 9, highPct: 17, label: "Moderate swings" },
  suggestedAnnualReturnPct: 6.8,
  educationalExplanation: "Compounding rewards patience.",
  assumptionsDisclosure: "All figures above are illustrations based on configurable assumptions, not promises.",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InvestorProfileScreen", () => {
  it("self-fetches and renders the full investment profile when no data is injected", async () => {
    investorProfileApi.get.mockResolvedValue(PROFILE_FIXTURE);
    investorProfileApi.getInvestmentProfile.mockResolvedValue(INVESTMENT_PROFILE_FIXTURE);

    render(<InvestorProfileScreen />);

    await waitFor(() => expect(screen.getByText("Your Investment Profile")).toBeInTheDocument());
    expect(screen.getByText(/Stocks 75%/)).toBeInTheDocument();
    expect(screen.getByText(/illustrations based on configurable assumptions, not promises/)).toBeInTheDocument();
  });

  it("shows a Get started button and reveal title only when onGetStarted is provided", async () => {
    investorProfileApi.getInvestmentProfile.mockResolvedValue(INVESTMENT_PROFILE_FIXTURE);
    const onGetStarted = vi.fn();

    render(<InvestorProfileScreen profile={PROFILE_FIXTURE} onGetStarted={onGetStarted} />);

    await waitFor(() => expect(screen.getByText("Here's what we built for you")).toBeInTheDocument());
    expect(screen.getByText("Get started")).toBeInTheDocument();
  });

  it("shows an error state gracefully when the investment profile fails to load", async () => {
    investorProfileApi.get.mockResolvedValue(PROFILE_FIXTURE);
    investorProfileApi.getInvestmentProfile.mockRejectedValue(new Error("network error"));

    render(<InvestorProfileScreen />);

    await waitFor(() => expect(screen.getByText(/couldn't load your investment profile/)).toBeInTheDocument());
  });
});
