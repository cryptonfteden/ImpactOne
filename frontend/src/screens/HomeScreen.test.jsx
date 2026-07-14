import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  topRecommendations: [{ symbol: "NVDA", action: "BUY", qualityScore: 82, confidenceScore: 88, riskScore: 30, riskLabel: "Low" }, { symbol: "META", action: "EXIT", qualityScore: 50, confidenceScore: 60, riskScore: 85, riskLabel: "High" }],
  intelligenceTimeline: {
    overnight: [{ headline: "Overnight macro print" }],
    openingBell: [],
    today: [{ headline: "NVDA supply deal" }],
    thisWeek: [],
    longTerm: [],
  },
  todayForYou: [{ headline: "NVDA supply deal", whyItMatters: "Expands capacity.", priorityReason: "You hold a position this directly affects." }],
  portfolioMorningSummary: {
    mattersToday: [{ symbol: "NVDA", action: "BUY" }],
    canWaitCount: 2,
    biggestOpportunity: { symbol: "NVDA", action: "BUY", qualityScore: 82 },
    biggestRisk: { symbol: "META", action: "EXIT", riskLabel: "High" },
  },
};

const SUMMARY_NO_ACTION = {
  whatHappened: { headline: "Generic market headline", sourceName: null, sourceUrl: null },
  whyShouldICare: "General context.",
  howDoesItAffectMe: "This doesn't directly affect your current holdings or watchlist.",
  whatChangedSinceYesterday: [],
  whatChangedForMyPortfolio: { hasComparison: false, summary: "No prior-day snapshot yet — this is the first day being tracked.", changes: [] },
  whatChangedInBeliefs: [],
  shouldIDoAnythingToday: { hasAction: false, action: null, symbol: null, reasoning: null, recommendationId: null, qualityScore: null },
  topRecommendations: [],
  intelligenceTimeline: { overnight: [], openingBell: [], today: [], thisWeek: [], longTerm: [] },
  todayForYou: [],
  portfolioMorningSummary: { mattersToday: [], canWaitCount: 0, biggestOpportunity: null, biggestRisk: null },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("HomeScreen", () => {
  it("renders the five merged Morning Brief cards and nothing else", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Morning Brief")).toBeInTheDocument());
    expect(screen.getByText("Today For You")).toBeInTheDocument();
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("What changed in the platform's beliefs?")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Intelligence Timeline")).toBeInTheDocument();

    // Nothing else: still exactly six .home-card sections despite three
    // brand-new sections (Today For You, Portfolio Morning Summary,
    // Intelligence Timeline) — overlapping old cards were merged rather
    // than stacked on top, so total card count didn't grow (Sprint 28
    // Priority 6: reduce repeated cards, increase signal per card).
    const cards = document.querySelectorAll(".home-card");
    expect(cards).toHaveLength(6);
  });

  it("shows honest empty states across the merged cards when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/No action needed today/)).toBeInTheDocument());
    expect(screen.getByText(/No material change vs\. yesterday/)).toBeInTheDocument();
    expect(screen.getByText(/No theme thesis has changed recently/)).toBeInTheDocument();
    expect(screen.getByText(/No prior-day snapshot yet/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing prioritized for you right now/)).toBeInTheDocument();
    expect(screen.getByText(/No standout opportunity today/)).toBeInTheDocument();
    expect(screen.getByText(/No standout risk today/)).toBeInTheDocument();
  });

  it("shows real change data when it exists — belief change, portfolio delta, and yesterday diff", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText("BUY").length).toBeGreaterThan(0));
    expect(screen.getByText(/Top driver shifted from Fed policy/)).toBeInTheDocument();
    expect(screen.getByText(/Portfolio value up 1.2%/)).toBeInTheDocument();
    expect(screen.getByText(/AI capex remains elevated/)).toBeInTheDocument();
  });

  it("shows an at-a-glance strip summarizing action/portfolio/belief state without any new data fetch", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Action needed: Yes — NVDA/)).toBeInTheDocument());
    expect(screen.getByText(/Portfolio: 1 change\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Beliefs: 1 updated/)).toBeInTheDocument();
    expect(homeApi.getSummary).toHaveBeenCalledTimes(1);
  });

  it("glance strip reads 'No'/'Unchanged' honestly when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Action needed: No/)).toBeInTheDocument());
    expect(screen.getAllByText(/Unchanged/)).toHaveLength(2);
  });

  it("Sprint 28 — Today For You shows the real priority reason for each item, not a generic label", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/You hold a position this directly affects/)).toBeInTheDocument());
  });

  it("Sprint 28 — Portfolio card shows the real biggest opportunity and biggest risk, and matters-today/can-wait counts", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/Biggest opportunity: NVDA/)).toBeInTheDocument());
    expect(screen.getByText(/Biggest risk: META/)).toBeInTheDocument();
    expect(screen.getByText(/Matters today: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Can wait: 2/)).toBeInTheDocument();
  });

  it("Sprint 28 — Recommendations card lists topRecommendations beyond the single canonical verdict", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText(/META/).length).toBeGreaterThan(0));
    expect(screen.getByText(/quality 50\/100/)).toBeInTheDocument();
  });

  it("Sprint 28 — Intelligence Timeline defaults to Today and switches sections on click, with real per-section counts", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    render(<HomeScreen onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Overnight (1)")).toBeInTheDocument());
    expect(screen.getByText("Today (1)")).toBeInTheDocument();
    expect(screen.getAllByText("NVDA supply deal").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Overnight (1)"));
    expect(screen.getByText("Overnight macro print")).toBeInTheDocument();
  });
});
