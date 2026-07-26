import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import MissionControlHomeScreen from "./MissionControlHomeScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { morningBriefApi, claimsApi, portfolioEngineApi, marketSentimentApi, intelligenceApi } from "../services/api";
import { todaysBrief as fallbackBrief } from "./missionControl/missionControlMockData";

function renderScreen(props) {
  return render(
    <I18nProvider>
      <MissionControlHomeScreen {...props} />
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("Today's briefing")).toBeInTheDocument());
}

vi.mock("../services/api", () => ({
  morningBriefApi: { getToday: vi.fn() },
  claimsApi: { listActive: vi.fn(), listPortfolioRelevant: vi.fn(), listOvernightChanges: vi.fn() },
  portfolioEngineApi: { getPerformanceDelta: vi.fn() },
  marketSentimentApi: { getOverview: vi.fn() },
  intelligenceApi: { liveFeed: vi.fn() },
}));

const REAL_BRIEF = {
  items: [
    {
      claimId: "real-hero",
      type: "claim",
      headline: "Real hero headline",
      whyItMatters: "Real hero explanation sentence.",
      affectedAssets: ["NVDA"],
      attentionScore: 92,
      recommendedAttentionLevel: "High",
      confidence: 85,
    },
    {
      claimId: "real-brief-2",
      type: "claim",
      headline: "Second real brief headline",
      whyItMatters: "Second real explanation.",
      affectedAssets: ["AMD"],
      attentionScore: 60,
      recommendedAttentionLevel: "Medium",
      confidence: 55,
    },
  ],
  itemCount: 2,
  summary: "2 items ranked for today.",
};

const REAL_ACTIVE_CLAIMS = {
  claims: [
    {
      claimId: "real-risk",
      symbols: ["META"],
      expectedDirection: "BEARISH",
      confidence: 72,
      status: "WEAKENING",
      statement: "Real risk statement.",
      plainLanguageStatement: "Real risk plain language.",
      evidence: [{ id: "e1", observedFact: "Real risk evidence." }],
      portfolioImpact: { magnitude: 50, direction: "negative" },
    },
    {
      claimId: "real-opportunity",
      symbols: ["MSFT"],
      expectedDirection: "BULLISH",
      confidence: 90,
      status: "STRENGTHENING",
      statement: "Real opportunity statement.",
      plainLanguageStatement: "Real opportunity plain language.",
      evidence: [{ id: "e2", observedFact: "Real opportunity evidence." }],
      portfolioImpact: { magnitude: 80, direction: "positive" },
    },
  ],
};

const REAL_DELTA = {
  hasComparison: true,
  totalValue: 200000,
  valueChangePct: 2.5,
  summary: "Portfolio value up 2.5% since the last snapshot.",
  changes: [{ dimension: "totalValue", label: "Total portfolio value", beforeValue: 195000, afterValue: 200000, changePct: 2.5 }],
};

const REAL_PORTFOLIO_CLAIMS = { claims: [{ claimId: "real-risk", symbols: ["META"] }] };

const REAL_OVERNIGHT = {
  claims: [{ claimId: "real-overnight", symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "Real overnight plain language." }],
};

const REAL_SENTIMENT = { market: "US", score: 58, confidence: 64, missingInputs: [] };

const REAL_FEED = { feed: new Array(9).fill({ headline: "x" }) };

function mockAllLive() {
  morningBriefApi.getToday.mockResolvedValue(REAL_BRIEF);
  claimsApi.listActive.mockResolvedValue(REAL_ACTIVE_CLAIMS);
  portfolioEngineApi.getPerformanceDelta.mockResolvedValue(REAL_DELTA);
  claimsApi.listPortfolioRelevant.mockResolvedValue(REAL_PORTFOLIO_CLAIMS);
  claimsApi.listOvernightChanges.mockResolvedValue(REAL_OVERNIGHT);
  marketSentimentApi.getOverview.mockResolvedValue(REAL_SENTIMENT);
  intelligenceApi.liveFeed.mockResolvedValue(REAL_FEED);
}

function mockAllDown() {
  morningBriefApi.getToday.mockRejectedValue(new Error("down"));
  claimsApi.listActive.mockRejectedValue(new Error("down"));
  portfolioEngineApi.getPerformanceDelta.mockRejectedValue(new Error("down"));
  claimsApi.listPortfolioRelevant.mockRejectedValue(new Error("down"));
  claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
  marketSentimentApi.getOverview.mockRejectedValue(new Error("down"));
  intelligenceApi.liveFeed.mockRejectedValue(new Error("down"));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MissionControlHomeScreen — Phase LIVE-DATA-001 (real data + fallback)", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling today's briefing")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("fully live", () => {
    it("renders real data end to end and hides the Demo Mode indicator entirely", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo mode/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("status", { name: /Some sections are showing simulated data/ })).not.toBeInTheDocument();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      expect(within(briefRegion).getByText("Real hero headline")).toBeInTheDocument();

      const signalsRegion = screen.getByRole("region", { name: "Your Signals" });
      expect(within(signalsRegion).getByText(/\$200,000/)).toBeInTheDocument();
      expect(within(signalsRegion).getByText(/\+2\.5% since yesterday/)).toBeInTheDocument();
      expect(within(signalsRegion).getByText("Real risk plain language.")).toBeInTheDocument();
      expect(within(signalsRegion).getByText("Real opportunity plain language.")).toBeInTheDocument();

      const contextRegion = screen.getByRole("region", { name: "Context" });
      expect(within(contextRegion).getByText("Real overnight plain language.")).toBeInTheDocument();
      expect(within(contextRegion).getByText(/score 58\/100, confidence 64\/100/)).toBeInTheDocument();
      expect(within(contextRegion).getByText("9 more items in today's feed")).toBeInTheDocument();
    });

    it("logs which services connected", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[MissionControl] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Morning Brief", "Portfolio Intelligence", "Market Sentiment", "Daily Feed"]), unavailable: [] })
      );
    });
  });

  describe("fully down — graceful fallback to Demo Mode", () => {
    it("falls back to demo content everywhere and shows the full Demo Mode indicator", async () => {
      mockAllDown();
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Demo mode: showing simulated intelligence, not live data." });
      expect(within(indicator).getByText("Demo")).toBeInTheDocument();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      expect(within(briefRegion).getByText(fallbackBrief[0].headline)).toBeInTheDocument();
    });

    it("logs every unavailable service", async () => {
      mockAllDown();
      renderScreen();
      await waitForLoaded();

      const call = console.info.mock.calls.find(([message]) => message === "[MissionControl] service status");
      expect(call[1].connected).toEqual([]);
      expect(call[1].unavailable).toEqual(expect.arrayContaining(["Morning Brief", "Claims", "Attention Engine", "Portfolio Intelligence", "Market Sentiment", "Daily Feed"]));
    });
  });

  describe("partial outage — section-specific fallback", () => {
    it("falls back only the failed section and shows an accurate, section-specific Demo indicator", async () => {
      mockAllLive();
      marketSentimentApi.getOverview.mockRejectedValue(new Error("sentiment down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/Demo data/)).toBeInTheDocument();
      expect(within(indicator).getByText(/Market Pulse/)).toBeInTheDocument();

      // Every other section is still real.
      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      expect(within(briefRegion).getByText("Real hero headline")).toBeInTheDocument();
      const signalsRegion = screen.getByRole("region", { name: "Your Signals" });
      expect(within(signalsRegion).getByText(/\$200,000/)).toBeInTheDocument();
    });
  });

  describe("honest empty state — not the same as Demo Mode", () => {
    it("a real, honestly-empty Morning Brief shows its own empty state, never the demo fallback, and never triggers the Demo Mode indicator", async () => {
      mockAllLive();
      morningBriefApi.getToday.mockResolvedValue({ items: [], itemCount: 0, summary: "No meaningful intelligence to surface yet today." });
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      expect(within(briefRegion).getByText("No meaningful intelligence to surface yet today.")).toBeInTheDocument();
    });

    it("real active claims with no bearish claim shows an honest empty state for Biggest Risk, not the demo fallback", async () => {
      mockAllLive();
      claimsApi.listActive.mockResolvedValue({ claims: [REAL_ACTIVE_CLAIMS.claims[1]] });
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Signals" });
      const riskCard = within(region).getByText("Biggest Risk").closest(".nova-card");
      expect(within(riskCard).getByText("No bearish claims right now.")).toBeInTheDocument();
    });
  });

  describe("Tier 1 — The Brief interactions (regression, now on real data)", () => {
    it("expands Today's Brief to show every real item when the user asks for more", async () => {
      mockAllLive();
      morningBriefApi.getToday.mockResolvedValue({
        items: [
          REAL_BRIEF.items[0],
          { claimId: "b2", headline: "b2 headline", whyItMatters: "b2 why", affectedAssets: [], attentionScore: 50, recommendedAttentionLevel: "Medium" },
          { claimId: "b3", headline: "b3 headline", whyItMatters: "b3 why", affectedAssets: [], attentionScore: 40, recommendedAttentionLevel: "Low" },
          { claimId: "b4", headline: "b4 headline", whyItMatters: "b4 why", affectedAssets: [], attentionScore: 30, recommendedAttentionLevel: "Low" },
        ],
      });
      renderScreen();
      await waitForLoaded();

      const briefRegion = screen.getByRole("region", { name: "Today's Brief" });
      fireEvent.click(within(briefRegion).getByText("+1 more"));
      expect(within(briefRegion).getByText("b4 headline")).toBeInTheDocument();
      expect(within(briefRegion).getByText("Show less")).toBeInTheDocument();
    });
  });

  describe("Tier 2 — Signal card expand (regression, now on real data)", () => {
    it("'Show more' reveals the real portfolio impact and 'Show less' hides it again", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const region = screen.getByRole("region", { name: "Your Signals" });
      const riskCard = within(region).getByText("Biggest Risk").closest(".nova-card");
      expect(within(riskCard).queryByText(/Portfolio impact:/)).not.toBeInTheDocument();

      fireEvent.click(within(riskCard).getByText("Show more"));
      expect(within(riskCard).getByText("Portfolio impact: 50/100 (negative)")).toBeInTheDocument();

      fireEvent.click(within(riskCard).getByText("Show less"));
      expect(within(riskCard).queryByText(/Portfolio impact:/)).not.toBeInTheDocument();
    });
  });

  it("navigates to the Daily Feed screen from the Live Intelligence teaser", async () => {
    mockAllLive();
    const onNavigate = vi.fn();
    renderScreen({ onNavigate });
    await waitForLoaded();

    fireEvent.click(screen.getByText("Open Daily Feed"));
    expect(onNavigate).toHaveBeenCalledWith("Daily Feed");
  });

  it("closes the briefing with a deliberate, real, computed Session Summary line", async () => {
    mockAllLive();
    renderScreen();
    await waitForLoaded();

    const region = screen.getByRole("region", { name: "Context" });
    expect(within(region).getByText("That's today's briefing: 1 item needs your attention, 1 are worth knowing, and 0 are quiet.")).toBeInTheDocument();
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".mission-control-screen")).toHaveAttribute("dir", "ltr");
  });
});
