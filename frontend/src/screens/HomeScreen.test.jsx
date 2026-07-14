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
  whatChangedSinceYesterday: ["Top driver shifted from Fed policy to earnings season."],
  whatChangedForMyPortfolio: { hasComparison: true, summary: "Portfolio value up 1.2% since the last snapshot.", changes: [{ dimension: "totalValue", label: "Total portfolio value", beforeValue: 100000, afterValue: 101200, changePct: 1.2 }] },
  whatChangedInBeliefs: [{ themeKey: "ai", themeLabel: "AI", changedAt: "2026-07-13T00:00:00.000Z", newThesis: "AI capex remains elevated." }],
  shouldIDoAnythingToday: { hasAction: true, action: "BUY", symbol: "NVDA", reasoning: "Strong tailwind.", recommendationId: "rec-1", qualityScore: 82 },
};

const SUMMARY_NO_ACTION = {
  whatHappened: { headline: "Generic market headline", sourceName: null, sourceUrl: null },
  whyShouldICare: "General context.",
  howDoesItAffectMe: "This doesn't directly affect your current holdings or watchlist.",
  whatChangedSinceYesterday: [],
  whatChangedForMyPortfolio: { hasComparison: false, summary: "No prior-day snapshot yet — this is the first day being tracked.", changes: [] },
  whatChangedInBeliefs: [],
  shouldIDoAnythingToday: { hasAction: false, action: null, symbol: null, reasoning: null, recommendationId: null, qualityScore: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomeScreen", () => {
  it("renders exactly the six required questions and nothing else", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("What happened?")).toBeInTheDocument());
    expect(screen.getByText("Why should I care?")).toBeInTheDocument();
    expect(screen.getByText("What changed since yesterday?")).toBeInTheDocument();
    expect(screen.getByText("What changed for my portfolio?")).toBeInTheDocument();
    expect(screen.getByText("What changed in the platform's beliefs?")).toBeInTheDocument();
    expect(screen.getByText("What should I pay attention to today?")).toBeInTheDocument();

    // Nothing else: exactly six .home-card sections should exist.
    const cards = document.querySelectorAll(".home-card");
    expect(cards).toHaveLength(6);
  });

  it("shows honest empty states for every 'what changed' card when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/No action needed today/)).toBeInTheDocument());
    expect(screen.getByText(/No material change vs\. yesterday/)).toBeInTheDocument();
    expect(screen.getByText(/No theme thesis has changed recently/)).toBeInTheDocument();
    expect(screen.getByText(/No prior-day snapshot yet/)).toBeInTheDocument();
  });

  it("shows real change data when it exists — belief change, portfolio delta, and yesterday diff", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("BUY")).toBeInTheDocument());
    expect(screen.getByText(/Top driver shifted from Fed policy/)).toBeInTheDocument();
    expect(screen.getByText(/Portfolio value up 1.2%/)).toBeInTheDocument();
    expect(screen.getByText(/AI capex remains elevated/)).toBeInTheDocument();
    expect(screen.getAllByText("BUY")).toHaveLength(1);
  });

  it("Sprint 27 — shows an at-a-glance strip summarizing action/portfolio/belief state without any new data fetch", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Action needed: Yes — NVDA/)).toBeInTheDocument());
    expect(screen.getByText(/Portfolio: 1 change\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Beliefs: 1 updated/)).toBeInTheDocument();
    expect(homeApi.getSummary).toHaveBeenCalledTimes(1);
  });

  it("Sprint 27 — glance strip reads 'No'/'Unchanged' honestly when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Action needed: No/)).toBeInTheDocument());
    expect(screen.getAllByText(/Unchanged/)).toHaveLength(2);
  });
});
