import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import OnboardingFlow from "./OnboardingFlow";
import { investorProfileApi } from "../../services/api";

vi.mock("../../services/api", () => ({
  investorProfileApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getInvestmentProfile: vi.fn(),
  },
}));

const INVESTMENT_PROFILE_FIXTURE = {
  suggestedAllocation: { stocks: 80, bonds: 14, cash: 6 },
  diversificationExplanation: "Spread across stocks, bonds, and cash.",
  expectedVolatility: { lowPct: 10, highPct: 18, label: "Moderate swings" },
  suggestedAnnualReturnPct: 7.2,
  educationalExplanation: "Compounding rewards patience.",
  assumptionsDisclosure: "All figures above are illustrations based on configurable assumptions, not promises.",
};

describe("OnboardingFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    investorProfileApi.getInvestmentProfile.mockResolvedValue(INVESTMENT_PROFILE_FIXTURE);
  });

  it("requires a valid age before advancing past step 1", () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Enter a valid age to continue.")).toBeInTheDocument();
    expect(screen.getByText("How old are you?")).toBeInTheDocument();
  });

  it("advances to step 2 once a valid age is entered", async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Age"), { target: { value: "17" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => expect(screen.getByText("Where are you investing from?")).toBeInTheDocument());
  });

  it("a chip selection auto-advances to the next step", async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Age"), { target: { value: "30" } });
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Where are you investing from?")).toBeInTheDocument());

    fireEvent.click(screen.getByText("United States"));
    await waitFor(() => expect(screen.getByText("How experienced are you as an investor?")).toBeInTheDocument());
  });

  it("the Skip button advances without recording an answer", async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Age"), { target: { value: "30" } });
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Where are you investing from?")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("How experienced are you as an investor?")).toBeInTheDocument());
  });

  it("the monthly-amount step shows currency-prefixed chips derived from the selected country", async () => {
    render(<OnboardingFlow onComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Age"), { target: { value: "30" } });
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Where are you investing from?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Israel"));
    await waitFor(() => expect(screen.getByText("How experienced are you as an investor?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Beginner"));

    await waitFor(() => expect(screen.getByText("₪500")).toBeInTheDocument());
  });

  it("completes the flow and submits all collected answers, showing a submitting state", async () => {
    let resolveComplete;
    const onComplete = vi.fn(() => new Promise((resolve) => { resolveComplete = resolve; }));
    const onFinish = vi.fn();

    render(<OnboardingFlow onComplete={onComplete} onFinish={onFinish} />);

    fireEvent.change(screen.getByPlaceholderText("Age"), { target: { value: "17" } });
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(screen.getByText("Where are you investing from?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("How experienced are you as an investor?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("How much can you invest monthly?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("What's your main investment goal?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("How would you describe your risk tolerance?")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Skip"));
    await waitFor(() => expect(screen.getByText("What's your investment horizon?")).toBeInTheDocument());

    fireEvent.click(screen.getByText("5+ years"));

    await waitFor(() => expect(screen.getByText("Building your profile...")).toBeInTheDocument());
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ age: 17, investmentHorizon: "LONG_TERM" }));

    resolveComplete({ id: "p1", age: 17, country: null, monthlyInvestmentAmount: null });

    await waitFor(() => expect(screen.getByText("Here's what we built for you")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Get started"));
    expect(onFinish).toHaveBeenCalled();
  });
});
