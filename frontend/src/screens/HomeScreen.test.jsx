import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { homeApi } from "../services/api";
import { insiderOpportunitiesApi, weeklyFibonacciOpportunitiesApi } from "../services/api";
import { clearRequestCache } from "../services/requestCache";
import { I18nProvider } from "../i18n/I18nProvider";

function renderHomeScreen(props) {
  return render(
    <I18nProvider>
      <HomeScreen {...props} />
    </I18nProvider>
  );
}

vi.mock("../services/api", () => ({
  homeApi: { getSummary: vi.fn() },
  // Phase H3 — Active Alerts card; resolves to no alerts by default so
  // existing Home tests are unaffected by this additive card.
  priceAlertsApi: { list: vi.fn().mockResolvedValue({ alerts: [] }) },
  insiderOpportunitiesApi: { list: vi.fn().mockResolvedValue({ opportunities: [], coverage: {} }) },
  weeklyFibonacciOpportunitiesApi: { list: vi.fn().mockResolvedValue({ opportunities: [], coverage: {} }) },
  dailyAgentPicksApi: { list: vi.fn().mockResolvedValue({ categories: [], gold: [], coverage: {} }) },
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
  personalBrief: ["Market: NVDA supply deal", "Portfolio: Portfolio value up 1.2% since the last snapshot.", "Top for you: NVDA — BUY (quality 82/100)", "Action needed: NVDA — BUY"],
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
  personalBrief: ["Market: Generic market headline", "No action needed today."],
};

beforeEach(() => {
  vi.clearAllMocks();
  // Phase REAL-WORLD-USAGE-001 — HomeScreen now shares the same real
  // request cache Mission Control/Portfolio Workspace/News Intelligence
  // already use (see HomeScreen.jsx); the cache is module-scoped, so it
  // must be cleared between tests the same way those screens' own tests
  // already do, or an earlier test's cached response would leak into a
  // later test expecting a different mocked response.
  clearRequestCache();
});

describe("HomeScreen", () => {
  it("loads the canonical market-wide opportunity reports instead of personalizing the main board by watchlist", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(insiderOpportunitiesApi.list).toHaveBeenCalled());
    expect(insiderOpportunitiesApi.list).toHaveBeenCalledWith();
    expect(weeklyFibonacciOpportunitiesApi.list).toHaveBeenCalledWith();
  });

  it("renders only the investor decision cards on Today", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Portfolio")).toBeInTheDocument());
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Recommendations")).toBeInTheDocument();
    expect(screen.getByText("Intelligence Timeline")).toBeInTheDocument();
    expect(screen.queryByText("Today For You")).not.toBeInTheDocument();
    expect(screen.queryByText("What changed in the platform's beliefs?")).not.toBeInTheDocument();

    // Six adaptive cards despite three brand-new sections (Today For You,
    // Portfolio Morning Summary, Intelligence Timeline) — overlapping old
    // cards were merged rather than stacked on top (Sprint 28 Priority 6).
    // Active Alerts and the source-verified Daily Agent board are the two
    // intentional additions above the five adaptive decision cards.
    const cards = document.querySelectorAll(".home-card");
    expect(cards).toHaveLength(7);
    expect(screen.getByText("Active Alerts")).toBeInTheDocument();
  });

  it("shows honest empty states across the merged cards when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getAllByText(/No action needed today/).length).toBeGreaterThan(0));
    expect(screen.getByText(/No prior-day snapshot yet/)).toBeInTheDocument();
  });

  it("shows real change data when it exists — belief change, portfolio delta, and yesterday diff", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getAllByText("BUY").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Portfolio value up 1.2%/).length).toBeGreaterThan(0);
  });

  it("shows an at-a-glance strip summarizing action/portfolio/belief state without any new data fetch", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText(/Action needed: Yes — NVDA/)).toBeInTheDocument());
    expect(screen.getByText(/Portfolio: 1 change\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Beliefs: 1 updated/)).toBeInTheDocument();
    expect(homeApi.getSummary).toHaveBeenCalledTimes(1);
  });

  it("glance strip reads 'No'/'Unchanged' honestly when nothing changed", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_NO_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText(/Action needed: No/)).toBeInTheDocument());
    expect(screen.getAllByText(/Unchanged/)).toHaveLength(2);
  });

  it("Sprint 28 — Today For You shows the real priority reason for each item, not a generic label", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Portfolio")).toBeInTheDocument());
    expect(screen.queryByText(/You hold a position this directly affects/)).not.toBeInTheDocument();
  });

  it("Sprint 28 — Portfolio card shows the real biggest opportunity and biggest risk, and matters-today/can-wait counts", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText(/Biggest opportunity: NVDA/)).toBeInTheDocument());
    expect(screen.getByText(/Biggest risk: META/)).toBeInTheDocument();
    expect(screen.getByText("Matters today")).toBeInTheDocument();
    expect(screen.getByText("Can wait")).toBeInTheDocument();
  });

  it("Sprint 28 — Recommendations card lists topRecommendations beyond the single canonical verdict", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getAllByText(/NVDA/).length).toBeGreaterThan(0));
    expect(screen.queryByText(/quality 50\/100/)).not.toBeInTheDocument();
  });

  it("Sprint 28 — Intelligence Timeline defaults to Today and switches sections on click, with real per-section counts", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Overnight")).toBeInTheDocument());
    expect(screen.getAllByText("Today").length).toBeGreaterThan(0);
    expect(screen.getAllByText("NVDA supply deal").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Overnight"));
    expect(screen.getByText("Overnight macro print")).toBeInTheDocument();
  });

  it("Sprint 30 — shows the Morning Personal Brief at the top of Home, capped at a handful of lines", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByLabelText("Morning personal brief")).toBeInTheDocument());
    const brief = screen.getByLabelText("Morning personal brief");
    expect(brief.querySelectorAll("li").length).toBe(4);
    expect(brief.querySelectorAll(".morning-brief-list__orbit")).toHaveLength(4);
    expect(screen.getByLabelText("Today's date")).toBeInTheDocument();
    expect(screen.getByText("Market: NVDA supply deal")).toBeInTheDocument();
    expect(screen.getByText("Top for you: NVDA — BUY (quality 82/100)")).toBeInTheDocument();
  });

  it("Sprint 35 Priority 4 — the Morning Brief card doesn't repeat the headline the hero's personal brief already stated", async () => {
    homeApi.getSummary.mockResolvedValue(SUMMARY_WITH_ACTION);
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Market: NVDA supply deal")).toBeInTheDocument());
    // "NVDA supply deal" alone (not prefixed with "Market: ") should only
    // appear via Today For You / Intelligence Timeline's real per-item
    // headlines, not a second time as the Morning Brief card's own
    // duplicate headline paragraph.
    const bareHeadlineMatches = screen.getAllByText("NVDA supply deal");
    expect(bareHeadlineMatches.length).toBe(1);
  });

  it("Sprint 35 Priority 4 — the Morning Brief card DOES show the headline when the hero brief has no lines to cover it", async () => {
    homeApi.getSummary.mockResolvedValue({ ...SUMMARY_NO_ACTION, personalBrief: [] });
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Portfolio")).toBeInTheDocument());
    expect(screen.queryByText("Generic market headline")).not.toBeInTheDocument();
  });

  it("Sprint 30 — Morning Personal Brief renders nothing when the backend sends no lines, never a fabricated placeholder", async () => {
    homeApi.getSummary.mockResolvedValue({ ...SUMMARY_NO_ACTION, personalBrief: [] });
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Your morning brief")).toBeInTheDocument());
    expect(screen.queryByLabelText("Morning personal brief")).not.toBeInTheDocument();
  });

  it("Sprint 32 Priority 2 — renders the six cards in the real adaptive cardOrder the backend returns, not a fixed order", async () => {
    homeApi.getSummary.mockResolvedValue({
      ...SUMMARY_WITH_ACTION,
      cardOrder: ["morningBrief", "recommendations", "intelligenceTimeline", "portfolio", "beliefs", "todayForYou"],
    });
    renderHomeScreen({ onNavigate: vi.fn() });

    await waitFor(() => expect(screen.getByText("Recommendations")).toBeInTheDocument());
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    const cardTitles = ["Recommendations", "Intelligence Timeline", "Portfolio"];
    const positions = cardTitles.map((title) => headings.findIndex((heading) => heading.includes(title)));
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});
