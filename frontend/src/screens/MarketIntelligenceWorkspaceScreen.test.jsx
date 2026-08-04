import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import MarketIntelligenceWorkspaceScreen from "./MarketIntelligenceWorkspaceScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { PlatformProvider } from "../context/PlatformContext";
import { clearRequestCache } from "../services/requestCache";
import { marketSentimentApi, intelligenceApi, claimsApi } from "../services/api";
import { fallbackSentiment } from "./marketIntelligence/marketIntelligenceMockData";

vi.mock("../services/api", () => ({
  marketSentimentApi: { getOverview: vi.fn() },
  intelligenceApi: { liveFeed: vi.fn(), globalMap: vi.fn() },
  claimsApi: { listOvernightChanges: vi.fn() },
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <PlatformProvider navigate={() => {}}>
        <MarketIntelligenceWorkspaceScreen />
      </PlatformProvider>
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("What's happening across the market")).toBeInTheDocument());
}

const REAL_SENTIMENT = { market: "US", score: 62, confidence: 70, trend: "up", missingInputs: [] };

const REAL_FEED = {
  feed: [
    { id: "f1", headline: "Tech rallies on AI capex", affectedSectors: ["Technology"], impactType: "opportunity", importanceScore: 80 },
    { id: "f2", headline: "Energy slides on oversupply", affectedSectors: ["Energy"], impactType: "risk", importanceScore: 60 },
  ],
};

const REAL_GLOBAL_MAP = {
  globalMap: {
    majorGlobalEvents: [{ headline: "Central bank holds rates steady", countries: ["United States"], sectors: ["Financials"], score: 75 }],
    capitalFlows: [{ from: "Bonds", to: "Technology", rationale: "Falling yields favor growth equities." }],
    macroRegime: "Risk-on",
    sectorPropagation: [{ headline: "AI capex", sectors: ["Technology"], assets: ["NVDA"] }],
  },
};

const REAL_OVERNIGHT = {
  claims: [{ claimId: "c1", symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "NVDA outlook improves." }],
};

function mockAllLive() {
  marketSentimentApi.getOverview.mockResolvedValue(REAL_SENTIMENT);
  intelligenceApi.liveFeed.mockResolvedValue(REAL_FEED);
  intelligenceApi.globalMap.mockResolvedValue(REAL_GLOBAL_MAP);
  claimsApi.listOvernightChanges.mockResolvedValue(REAL_OVERNIGHT);
}

function mockAllDown() {
  marketSentimentApi.getOverview.mockRejectedValue(new Error("down"));
  intelligenceApi.liveFeed.mockRejectedValue(new Error("down"));
  intelligenceApi.globalMap.mockRejectedValue(new Error("down"));
  claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRequestCache();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MarketIntelligenceWorkspaceScreen — Phase MARKET-INTELLIGENCE-001", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling market intelligence")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("fully live", () => {
    it("renders real market sentiment in the hero and hides Demo Mode entirely", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo mode/ })).not.toBeInTheDocument();
      const sentimentRegion = screen.getByRole("region", { name: "Market Sentiment" });
      expect(within(sentimentRegion).getByText("US market — score 62/100")).toBeInTheDocument();
      expect(within(sentimentRegion).getByText("Risk-on")).toBeInTheDocument();
    });

    it("aggregates real feed items into leading and weakening sectors", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const sectorRegion = screen.getByRole("region", { name: "Sector Standing" });
      const leaders = within(sectorRegion).getByText("Sectors Leading").closest(".nova-card");
      expect(within(leaders).getByText("Technology")).toBeInTheDocument();

      const weakening = within(sectorRegion).getByText("Sectors Weakening").closest(".nova-card");
      expect(within(weakening).getByText("Energy")).toBeInTheDocument();
    });

    it("formats a real, structured macroRegime object into an honest sentence instead of rendering it raw", async () => {
      mockAllLive();
      intelligenceApi.globalMap.mockResolvedValue({
        globalMap: { ...REAL_GLOBAL_MAP.globalMap, macroRegime: { riskMode: "risk-on", inflationPressure: "moderate", recessionRisk: "low", liquidityTrend: "expanding" } },
      });
      renderScreen();
      await waitForLoaded();

      const sentimentRegion = screen.getByRole("region", { name: "Market Sentiment" });
      expect(within(sentimentRegion).getByText(/Risk mode: risk-on/)).toBeInTheDocument();
      expect(within(sentimentRegion).getByText(/liquidity trend: expanding/)).toBeInTheDocument();
    });

    it("renders real macro events and capital flow", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const mapRegion = screen.getByRole("region", { name: "Global Map" });
      expect(within(mapRegion).getByText("Central bank holds rates steady")).toBeInTheDocument();
      expect(within(mapRegion).getByText("Bonds → Technology")).toBeInTheDocument();
      expect(within(mapRegion).getByText("Falling yields favor growth equities.")).toBeInTheDocument();
    });

    it("renders real overnight Claim changes as what to monitor next", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const mapRegion = screen.getByRole("region", { name: "Global Map" });
      expect(within(mapRegion).getByText("Getting more likely")).toBeInTheDocument();
      expect(within(mapRegion).getByText("NVDA outlook improves.")).toBeInTheDocument();
    });

    it("logs which services connected", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[MarketIntelligence] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Market Sentiment", "Daily Feed", "Global Map", "Claims (overnight changes)"]), unavailable: [] })
      );
    });
  });

  describe("fully down — graceful fallback to Demo Mode", () => {
    it("falls back to demo content and shows the full Demo Mode indicator", async () => {
      mockAllDown();
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Demo mode: showing simulated intelligence, not live data." });
      expect(within(indicator).getByText("Demo")).toBeInTheDocument();

      const sentimentRegion = screen.getByRole("region", { name: "Market Sentiment" });
      expect(within(sentimentRegion).getByText(`US market — score ${fallbackSentiment.score}/100`)).toBeInTheDocument();
    });
  });

  describe("partial outage — section-specific fallback", () => {
    it("falls back only the failed section", async () => {
      mockAllLive();
      claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/What to Monitor Next/)).toBeInTheDocument();

      const sentimentRegion = screen.getByRole("region", { name: "Market Sentiment" });
      expect(within(sentimentRegion).getByText("US market — score 62/100")).toBeInTheDocument();
    });
  });

  describe("honest empty states — never the same as Demo Mode", () => {
    it("shows honest empty states when there is genuinely nothing to rank", async () => {
      mockAllLive();
      intelligenceApi.liveFeed.mockResolvedValue({ feed: [] });
      claimsApi.listOvernightChanges.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
      expect(screen.getByText("No sector is clearly leading right now.")).toBeInTheDocument();
      expect(screen.getByText("No sector is clearly weakening right now.")).toBeInTheDocument();
      expect(screen.getByText("No Claims changed overnight — nothing new to monitor right now.")).toBeInTheDocument();
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".market-intelligence-workspace-screen")).toHaveAttribute("dir", "ltr");
  });
});
