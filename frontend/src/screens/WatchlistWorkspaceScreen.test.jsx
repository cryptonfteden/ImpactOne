import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import WatchlistWorkspaceScreen from "./WatchlistWorkspaceScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { PlatformProvider } from "../context/PlatformContext";
import { clearRequestCache } from "../services/requestCache";
import { intelligenceApi, claimsApi } from "../services/api";
import { fallbackRankings } from "./watchlistWorkspace/watchlistWorkspaceMockData";

vi.mock("../services/api", () => ({
  intelligenceApi: { watchlistPriority: vi.fn() },
  claimsApi: { listOvernightChanges: vi.fn() },
}));

const mockUseWatchlist = vi.fn();
vi.mock("../hooks/useWatchlist", () => ({
  default: () => mockUseWatchlist(),
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <PlatformProvider navigate={() => {}}>
        <WatchlistWorkspaceScreen />
      </PlatformProvider>
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("What deserves your attention today")).toBeInTheDocument());
}

const REAL_RANKINGS = {
  generatedAt: "2026-07-27T12:00:00.000Z",
  watchlistRankings: [
    {
      symbol: "NVDA",
      opportunityScore: 88,
      riskScore: 30,
      overallAiScore: 92,
      primaryDriver: "NVDA capacity constraint",
      explanation: "Real capacity constraint explanation.",
      currentPrice: 500,
      dayChangePercent: 2.1,
    },
    {
      symbol: "META",
      opportunityScore: 35,
      riskScore: 72,
      overallAiScore: 55,
      primaryDriver: "META pricing risk",
      explanation: "Real pricing risk explanation.",
      currentPrice: 420,
      dayChangePercent: -1.2,
    },
  ],
};

const REAL_OVERNIGHT = {
  claims: [
    { claimId: "c1", symbols: ["NVDA"], status: "STRENGTHENING", plainLanguageStatement: "NVDA outlook improves.", lastUpdatedAt: "2026-07-27T10:00:00.000Z" },
  ],
};

function mockAllLive() {
  intelligenceApi.watchlistPriority.mockResolvedValue(REAL_RANKINGS);
  claimsApi.listOvernightChanges.mockResolvedValue(REAL_OVERNIGHT);
}

function mockAllDown() {
  intelligenceApi.watchlistPriority.mockRejectedValue(new Error("down"));
  claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRequestCache();
  mockUseWatchlist.mockReturnValue({ watchlist: ["NVDA", "META"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WatchlistWorkspaceScreen — Phase WATCHLIST-001", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling watchlist intelligence")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("fully live", () => {
    it("renders the highest-ranked symbol as the hero and hides Demo Mode entirely", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo mode/ })).not.toBeInTheDocument();

      const topPriority = screen.getByRole("region", { name: "Top Priority" });
      expect(within(topPriority).getByText("NVDA")).toBeInTheDocument();
      expect(within(topPriority).getByText("Real capacity constraint explanation.")).toBeInTheDocument();
    });

    it("answers why, what changed, and next action for every remaining ranked symbol", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const watchlistRegion = screen.getByRole("region", { name: "Your Watchlist" });
      expect(within(watchlistRegion).getByText("META")).toBeInTheDocument();
      expect(within(watchlistRegion).getByText(/Why:/)).toBeInTheDocument();
      expect(within(watchlistRegion).getByText(/What changed:/)).toBeInTheDocument();
      expect(within(watchlistRegion).getByText(/Next action:/)).toBeInTheDocument();
      expect(within(watchlistRegion).getByText(/Review risk exposure/)).toBeInTheDocument();
    });

    it("surfaces a real overnight STRENGTHENING transition among watchlist symbols as 'became more important'", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const watchlistRegion = screen.getByRole("region", { name: "Your Watchlist" });
      expect(within(watchlistRegion).getByText("Getting more likely")).toBeInTheDocument();
      expect(within(watchlistRegion).getByText("NVDA outlook improves.")).toBeInTheDocument();
    });

    it("logs which services connected", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[WatchlistWorkspace] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Watchlist Priority", "Claims (overnight changes)"]), unavailable: [] })
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

      const topPriority = screen.getByRole("region", { name: "Top Priority" });
      expect(within(topPriority).getByText(fallbackRankings[0].symbol)).toBeInTheDocument();
    });
  });

  describe("partial outage — section-specific fallback", () => {
    it("falls back only the failed section", async () => {
      mockAllLive();
      claimsApi.listOvernightChanges.mockRejectedValue(new Error("down"));
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/What Changed Since Yesterday/)).toBeInTheDocument();

      const topPriority = screen.getByRole("region", { name: "Top Priority" });
      expect(within(topPriority).getByText("NVDA")).toBeInTheDocument();
    });
  });

  describe("honest handling of an empty watchlist — never the backend's default symbols", () => {
    it("never calls watchlistPriority when the user's real watchlist is empty, and shows an honest empty state", async () => {
      mockUseWatchlist.mockReturnValue({ watchlist: [], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
      renderScreen();
      await waitForLoaded();

      expect(intelligenceApi.watchlistPriority).not.toHaveBeenCalled();
      expect(screen.getByText("Add a ticker to your watchlist to see intelligence here.")).toBeInTheDocument();
      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
    });
  });

  describe("honest empty states — never the same as Demo Mode", () => {
    it("a real, honestly-empty ranking list shows its own empty state", async () => {
      mockAllLive();
      intelligenceApi.watchlistPriority.mockResolvedValue({ generatedAt: "2026-07-27T12:00:00.000Z", watchlistRankings: [] });
      renderScreen();
      await waitForLoaded();

      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
      const topPriority = screen.getByRole("region", { name: "Top Priority" });
      expect(within(topPriority).getByText("No watchlist intelligence to surface yet today.")).toBeInTheDocument();
    });

    it("a real, honestly-empty overnight-changes list shows an honest 'no symbol became more important' state", async () => {
      mockAllLive();
      claimsApi.listOvernightChanges.mockResolvedValue({ claims: [] });
      renderScreen();
      await waitForLoaded();

      const watchlistRegion = screen.getByRole("region", { name: "Your Watchlist" });
      expect(within(watchlistRegion).getByText("No watchlist symbol became more important overnight.")).toBeInTheDocument();
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".watchlist-workspace-screen")).toHaveAttribute("dir", "ltr");
  });
});
