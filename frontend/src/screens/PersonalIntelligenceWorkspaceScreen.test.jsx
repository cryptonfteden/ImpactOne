import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import PersonalIntelligenceWorkspaceScreen from "./PersonalIntelligenceWorkspaceScreen";
import { I18nProvider } from "../i18n/I18nProvider";
import { PlatformProvider } from "../context/PlatformContext";
import { clearRequestCache } from "../services/requestCache";
import { personalizationApi, intelligenceApi, claimsApi } from "../services/api";

vi.mock("../services/api", () => ({
  personalizationApi: { get: vi.fn() },
  intelligenceApi: { watchlistPriority: vi.fn() },
  claimsApi: { listActive: vi.fn() },
}));

const mockUseInvestorProfile = vi.fn();
vi.mock("../hooks/useInvestorProfile", () => ({
  default: () => mockUseInvestorProfile(),
}));

const mockUseWatchlist = vi.fn();
vi.mock("../hooks/useWatchlist", () => ({
  default: () => mockUseWatchlist(),
}));

function renderScreen() {
  return render(
    <I18nProvider>
      <PlatformProvider navigate={() => {}}>
        <PersonalIntelligenceWorkspaceScreen />
      </PlatformProvider>
    </I18nProvider>
  );
}

async function waitForLoaded() {
  await waitFor(() => expect(screen.getByText("Why this matters to you")).toBeInTheDocument());
}

const REAL_PROFILE = { age: 34, riskTolerance: "HIGH", investmentHorizon: "LONG_TERM" };

const REAL_PERSONALIZATION = {
  preferredSectors: [{ key: "Technology", count: 3 }],
  preferredMarketCapExposure: [{ key: "equity", count: 4 }],
};

const REAL_CLAIMS = {
  claims: [
    {
      claimId: "real-opp-1",
      symbols: ["NVDA"],
      sectors: ["Technology"],
      expectedDirection: "BULLISH",
      confidence: 88,
      status: "STRENGTHENING",
      plainLanguageStatement: "Real NVDA opportunity statement.",
      evidence: [{ id: "e1", observedFact: "Real supporting fact." }],
      counterEvidence: [],
      invalidationConditions: ["Real invalidation condition."],
      confirmationConditions: ["Real confirmation condition."],
      reasoning: { observed: ["Real observed fact."], inferred: [] },
    },
    {
      claimId: "real-risk-1",
      symbols: ["META"],
      sectors: ["Technology"],
      expectedDirection: "BEARISH",
      confidence: 70,
      status: "WEAKENING",
      plainLanguageStatement: "Real META risk statement.",
      evidence: [{ id: "e2", observedFact: "Real risk supporting fact." }],
      counterEvidence: [],
      invalidationConditions: [],
      confirmationConditions: [],
      reasoning: { observed: [], inferred: [] },
    },
    {
      claimId: "irrelevant-1",
      symbols: ["XOM"],
      sectors: ["Energy"],
      expectedDirection: "BULLISH",
      confidence: 95,
      status: "STRENGTHENING",
      plainLanguageStatement: "Irrelevant XOM statement — not a preferred sector or watchlist symbol.",
    },
  ],
};

const REAL_WATCHLIST_PRIORITY = {
  watchlistRankings: [{ symbol: "NVDA", overallAiScore: 91, explanation: "Real watchlist explanation." }],
};

function mockAllLive() {
  personalizationApi.get.mockResolvedValue(REAL_PERSONALIZATION);
  claimsApi.listActive.mockResolvedValue(REAL_CLAIMS);
  intelligenceApi.watchlistPriority.mockResolvedValue(REAL_WATCHLIST_PRIORITY);
}

beforeEach(() => {
  vi.clearAllMocks();
  clearRequestCache();
  mockUseInvestorProfile.mockReturnValue({ profile: REAL_PROFILE, hasProfile: true, isLoading: false, createProfile: vi.fn(), updateProfile: vi.fn(), refresh: vi.fn() });
  mockUseWatchlist.mockReturnValue({ watchlist: ["NVDA"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PersonalIntelligenceWorkspaceScreen — Phase PERSONAL-INTELLIGENCE-001", () => {
  it("shows a loading skeleton before data resolves", async () => {
    mockAllLive();
    renderScreen();
    expect(screen.getByLabelText("Assembling your personal intelligence")).toBeInTheDocument();
    await waitForLoaded();
  });

  describe("no investor profile — honest gate, never Demo Mode", () => {
    it("shows an honest prompt to complete the profile and never fetches personalization data", async () => {
      mockUseInvestorProfile.mockReturnValue({ profile: null, hasProfile: false, isLoading: false, createProfile: vi.fn(), updateProfile: vi.fn(), refresh: vi.fn() });
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText("Complete your investor profile to unlock personal intelligence.")).toBeInTheDocument();
      expect(personalizationApi.get).not.toHaveBeenCalled();
      expect(screen.queryByRole("status", { name: /Demo/ })).not.toBeInTheDocument();
    });
  });

  describe("fully live, with a real profile", () => {
    it("filters real claims to only those touching a preferred sector or watchlist symbol", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText("Real NVDA opportunity statement.")).toBeInTheDocument();
      expect(screen.getByText("Real META risk statement.")).toBeInTheDocument();
      expect(screen.queryByText(/Irrelevant XOM statement/)).not.toBeInTheDocument();
    });

    it("renders the real risk profile and preferred sectors", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      const preferencesRegion = screen.getByRole("region", { name: "Your Preferences" });
      expect(within(preferencesRegion).getByText("Risk: HIGH")).toBeInTheDocument();
      expect(within(preferencesRegion).getByText("Horizon: LONG_TERM")).toBeInTheDocument();
      expect(within(preferencesRegion).getByText("Technology")).toBeInTheDocument();
    });

    it("renders real watchlist priorities", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText("Real watchlist explanation.")).toBeInTheDocument();
    });

    it("hides Demo Mode entirely once every section is genuinely live", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();
      expect(screen.queryByRole("status", { name: /Demo mode/ })).not.toBeInTheDocument();
    });

    it("logs which services connected", async () => {
      mockAllLive();
      renderScreen();
      await waitForLoaded();

      expect(console.info).toHaveBeenCalledWith(
        "[PersonalIntelligence] service status",
        expect.objectContaining({ connected: expect.arrayContaining(["Personalization", "Claims", "Watchlist Priority"]), unavailable: [] })
      );
    });
  });

  describe("fetch failure — graceful fallback to Demo Mode", () => {
    it("falls back to demo content when personalization/claims fail", async () => {
      personalizationApi.get.mockRejectedValue(new Error("down"));
      claimsApi.listActive.mockRejectedValue(new Error("down"));
      intelligenceApi.watchlistPriority.mockResolvedValue(REAL_WATCHLIST_PRIORITY);
      renderScreen();
      await waitForLoaded();

      const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
      expect(within(indicator).getByText(/Demo data/)).toBeInTheDocument();
    });
  });

  describe("honest empty states — no watchlist, no relevant claims", () => {
    it("shows an honest empty state when the user's watchlist is empty", async () => {
      mockUseWatchlist.mockReturnValue({ watchlist: [], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
      personalizationApi.get.mockResolvedValue(REAL_PERSONALIZATION);
      claimsApi.listActive.mockResolvedValue(REAL_CLAIMS);
      renderScreen();
      await waitForLoaded();

      expect(intelligenceApi.watchlistPriority).not.toHaveBeenCalled();
      expect(screen.getByText("Add a ticker to your watchlist to see personalized priorities here.")).toBeInTheDocument();
    });

    it("shows honest empty states when nothing real touches the user's preferences", async () => {
      personalizationApi.get.mockResolvedValue({ preferredSectors: [], preferredMarketCapExposure: [] });
      claimsApi.listActive.mockResolvedValue({ claims: [] });
      mockUseWatchlist.mockReturnValue({ watchlist: [], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
      renderScreen();
      await waitForLoaded();

      expect(screen.getByText("No active Claim currently touches your preferred sectors or watchlist.")).toBeInTheDocument();
      expect(screen.getByText("No personalized opportunities right now.")).toBeInTheDocument();
      expect(screen.getByText("No personalized risks right now.")).toBeInTheDocument();
      expect(screen.getByText("No preferred sectors yet — open a position to build a real preference signal.")).toBeInTheDocument();
    });
  });

  it("carries the active dir (rtl/ltr) through to the root Page", async () => {
    mockAllLive();
    const { container } = renderScreen();
    await waitForLoaded();
    expect(container.querySelector(".personal-intelligence-workspace-screen")).toHaveAttribute("dir", "ltr");
  });
});
