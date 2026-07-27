import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import NewsIntelligenceScreen from "./NewsIntelligenceScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { intelligenceApi, claimsApi } from "../services/api";
import { fallbackFeed } from "./newsIntelligence/newsIntelligenceMockData";

function renderScreen() {
  return render(
    <I18nProvider>
      <NewsIntelligenceScreen />
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("What's happening, and why it's your problem")).toBeInTheDocument());
}

vi.mock("../services/api", () => ({
  intelligenceApi: { liveFeed: vi.fn() },
  claimsApi: { listOvernightChanges: vi.fn() },
}));

const REAL_FEED = {
  feed: [
    {
      id: "real-1",
      headline: "Real top story headline",
      whyItMatters: "Real explanation of why it matters.",
      affectedAssets: ["NVDA"],
      impactType: "risk",
      confidence: 80,
      attentionScore: 95,
      isHeld: true,
    },
    {
      id: "real-2",
      headline: "Real second story headline",
      whyItMatters: "Second real explanation.",
      affectedAssets: ["MSFT"],
      impactType: "opportunity",
      confidence: 70,
      attentionScore: 50,
      isHeld: false,
    },
  ],
};

const REAL_OVERNIGHT = {
  claims: [{ claimId: "real-overnight", symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "Real overnight plain language." }],
};

function mockAllLive() {
  intelligenceApi.liveFeed.mockResolvedValue(REAL_FEED);
  claimsApi.listOvernightChanges.mockResolvedValue(REAL_OVERNIGHT);
}

function mockAllDown() {
  intelligenceApi.liveFeed.mockRejectedValue(new Error("down"));
  claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NewsIntelligenceScreen — Phase NEWS-INTELLIGENCE-001", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling news intelligence")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("fully live", () => {
    it("renders the highest-attention item as the hero and hides Demo Mode entirely", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo mode/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("status", { name: /Some sections are showing simulated data/ })).not.toBeInTheDocument();

      const topStory = screen.getByRole("region", { name: "Top Story" });
      expect(within(topStory).getByText("Real top story headline")).toBeInTheDocument();
      expect(within(topStory).getByText("Held in your portfolio")).toBeInTheDocument();
    });

    it("renders every remaining ranked item in Today's Coverage, answering all five required questions", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const coverage = screen.getByRole("region", { name: "Today's Coverage" });
      expect(within(coverage).getAllByText("Real second story headline").length).toBeGreaterThan(0);
      expect(within(coverage).getByText(/What happened/)).toBeInTheDocument();
      expect(within(coverage).getByText(/Why it matters/)).toBeInTheDocument();
      expect(within(coverage).getByText(/Why you should care/)).toBeInTheDocument();
      expect(within(coverage).getByText(/Holdings affected/)).toBeInTheDocument();
      expect(within(coverage).getByText(/Changed since yesterday/)).toBeInTheDocument();
    });

    it("shows the real overnight Claim change in Context", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const context = screen.getByRole("region", { name: "Context" });
      expect(within(context).getByText("Real overnight plain language.")).toBeInTheDocument();
    });

    it("logs which services connected", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[NewsIntelligence] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Daily Feed", "Claims (overnight changes)"]), unavailable: [] })
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

      const topStory = screen.getByRole("region", { name: "Top Story" });
      expect(within(topStory).getByText(fallbackFeed[0].headline)).toBeInTheDocument();
    });

    it("logs every unavailable service", async () => {
      mockAllDown();
      renderScreen();
      await waitForLoaded();

      const call = console.info.mock.calls.find(([message]) => message === "[NewsIntelligence] service status");
      expect(call[1].connected).toEqual([]);
      expect(call[1].unavailable).toEqual(expect.arrayContaining(["Daily Feed", "Claims (overnight changes)"]));
    });
  });

  describe("partial outage — section-specific fallback", () => {
    it("falls back only the failed section and shows an accurate, section-specific Demo indicator", async () => {
      mockAllLive();
      claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/What Changed Since Yesterday/)).toBeInTheDocument();

      const topStory = screen.getByRole("region", { name: "Top Story" });
      expect(within(topStory).getByText("Real top story headline")).toBeInTheDocument();
    });
  });

  describe("honest empty states — never the same as Demo Mode", () => {
    it("a real, honestly-empty feed shows its own empty states, never the demo fallback", async () => {
      mockAllLive();
      intelligenceApi.liveFeed.mockResolvedValue({ feed: [] });
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
      const topStory = screen.getByRole("region", { name: "Top Story" });
      expect(within(topStory).getByText("No news items rose to meaningful attention today.")).toBeInTheDocument();
    });

    it("a real, honestly-empty overnight-changes list shows its own empty state", async () => {
      mockAllLive();
      claimsApi.listOvernightChanges.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      const context = screen.getByRole("region", { name: "Context" });
      expect(within(context).getByText("No Claims changed overnight.")).toBeInTheDocument();
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".news-intelligence-screen")).toHaveAttribute("dir", "ltr");
  });
});
