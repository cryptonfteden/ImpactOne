import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import WatchlistScreen from "./WatchlistScreen";
import { watchlistApi, claimsApi, optionsAgentApi } from "../services/api";

vi.mock("../services/api", () => ({
  watchlistApi: { getIntelligence: vi.fn() },
  claimsApi: { listBySymbol: vi.fn() },
  optionsAgentApi: { getSymbolView: vi.fn() },
}));

const useWatchlistMock = vi.fn();
vi.mock("../hooks/useWatchlist", () => ({
  default: (...args) => useWatchlistMock(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useWatchlistMock.mockReturnValue({ watchlist: ["NVDA"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
  claimsApi.listBySymbol.mockResolvedValue({ claims: [] });
  optionsAgentApi.getSymbolView.mockResolvedValue({ unavailable: true, activeSignalCount: 0 });
});

describe("WatchlistScreen", () => {
  it("Phase UI-INTEGRATION-001 — shows the honest 'nothing new' state when no real claim/options activity exists", async () => {
    watchlistApi.getIntelligence.mockResolvedValue({ watchlist: [{ symbol: "NVDA", company: "NVIDIA", price: 120, change: 1.2, aiScore: 70, aiRating: "Buy" }] });
    render(<WatchlistScreen />);

    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Nothing new today.")).toBeInTheDocument());
  });

  it("Phase UI-INTEGRATION-001 — shows a real, honest reason when a claim is strengthening", async () => {
    watchlistApi.getIntelligence.mockResolvedValue({ watchlist: [{ symbol: "NVDA", company: "NVIDIA", price: 120, change: 1.2, aiScore: 70, aiRating: "Buy" }] });
    claimsApi.listBySymbol.mockResolvedValue({ claims: [{ claimId: "c1", status: "STRENGTHENING" }] });
    render(<WatchlistScreen />);

    await waitFor(() => expect(screen.getByText(/Why today: Strengthening claim/)).toBeInTheDocument());
  });

  it("Phase UI-INTEGRATION-001 — a failed per-symbol claims/options lookup never blocks the watchlist from rendering", async () => {
    watchlistApi.getIntelligence.mockResolvedValue({ watchlist: [{ symbol: "NVDA", company: "NVIDIA", price: 120, change: 1.2, aiScore: 70, aiRating: "Buy" }] });
    claimsApi.listBySymbol.mockRejectedValue(new Error("down"));
    optionsAgentApi.getSymbolView.mockRejectedValue(new Error("down"));
    render(<WatchlistScreen />);

    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("Nothing new today.")).toBeInTheDocument());
  });

  describe("Phase PRODUCT-001 — ranked by Attention Score, not price movement", () => {
    it("shows the real max attentionScore across a symbol's claims as its Attention badge", async () => {
      watchlistApi.getIntelligence.mockResolvedValue({ watchlist: [{ symbol: "NVDA", company: "NVIDIA", price: 120, change: 1.2, aiScore: 70, aiRating: "Buy" }] });
      claimsApi.listBySymbol.mockResolvedValue({ claims: [{ claimId: "c1", status: "ACTIVE", attentionScore: 62 }, { claimId: "c2", status: "STRENGTHENING", attentionScore: 81 }] });
      render(<WatchlistScreen />);

      await waitFor(() => expect(screen.getByText("Attention 81/100")).toBeInTheDocument());
    });

    it("ranks a higher-attentionScore symbol above a lower one, regardless of price movement", async () => {
      useWatchlistMock.mockReturnValue({ watchlist: ["NVDA", "AMD"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() });
      watchlistApi.getIntelligence.mockResolvedValue({
        watchlist: [
          { symbol: "NVDA", company: "NVIDIA", price: 120, change: 0.1, aiScore: 70, aiRating: "Hold" },
          { symbol: "AMD", company: "AMD", price: 90, change: 9.5, aiScore: 60, aiRating: "Buy" },
        ],
      });
      claimsApi.listBySymbol.mockImplementation((symbol) =>
        Promise.resolve({
          claims: symbol === "NVDA" ? [{ claimId: "c1", status: "STRENGTHENING", attentionScore: 90 }] : [{ claimId: "c2", status: "ACTIVE", attentionScore: 20 }],
        })
      );
      render(<WatchlistScreen />);

      await waitFor(() => expect(screen.getByText("Attention 90/100")).toBeInTheDocument());
      const symbols = screen.getAllByRole("button", { name: /^(NVDA|AMD)$/ }).map((el) => el.textContent);
      // NVDA (attentionScore 90) must rank above AMD (attentionScore 20)
      // even though AMD moved far more in price today.
      expect(symbols.indexOf("NVDA")).toBeLessThan(symbols.indexOf("AMD"));
    });
  });
});
