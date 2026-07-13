import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { homeApi } from "../services/api";

vi.mock("../services/api", () => ({
  homeApi: { getSummary: vi.fn() },
}));

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: ["NVDA"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() }),
}));

const SUMMARY_WITH_ACTION = {
  whatHappened: { headline: "NVDA supply deal", sourceName: "Reuters", sourceUrl: "https://example.com/a" },
  whyShouldICare: "Expands NVDA's capacity.",
  howDoesItAffectMe: "Directly affects NVDA — 20% of your portfolio.",
  shouldIDoAnythingToday: { hasAction: true, action: "BUY", symbol: "NVDA", reasoning: "Strong tailwind.", recommendationId: "rec-1", qualityScore: 82 },
};

const SUMMARY_NO_ACTION = {
  whatHappened: { headline: "Generic market headline", sourceName: null, sourceUrl: null },
  whyShouldICare: "General context.",
  howDoesItAffectMe: "This doesn't directly affect your current holdings or watchlist.",
  shouldIDoAnythingToday: { hasAction: false, action: null, symbol: null, reasoning: null, recommendationId: null, qualityScore: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomeScreen", () => {
  it("renders exactly the four required questions and nothing else", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("What happened?")).toBeInTheDocument());
    expect(screen.getByText("Why should I care?")).toBeInTheDocument();
    expect(screen.getByText("How does it affect me?")).toBeInTheDocument();
    expect(screen.getByText("Should I do anything today?")).toBeInTheDocument();

    // Nothing else: exactly four .home-card sections should exist.
    const cards = document.querySelectorAll(".home-card");
    expect(cards).toHaveLength(4);
  });

  it("shows a calm 'no action needed' message when there is nothing to do", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/No action needed today/)).toBeInTheDocument());
  });

  it("shows the real canonical action pill when one exists, with no second/duplicate verdict", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("BUY")).toBeInTheDocument());
    expect(screen.getByText("NVDA")).toBeInTheDocument();
    expect(screen.getAllByText("BUY")).toHaveLength(1);
  });
});
