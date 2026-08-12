import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarketNewsScreen from "./MarketNewsScreen";
import { intelligenceApi, claimsApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";

vi.mock("../services/api", () => ({
  intelligenceApi: { liveFeed: vi.fn() },
  claimsApi: { listActive: vi.fn(), listRecentlyInvalidated: vi.fn() },
}));

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: [], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() }),
}));

const FEED_ITEM = {
  headline: "NVDA announces new AI chip partnership",
  whyItMatters: "Expands NVDA's data-center AI compute footprint.",
  importanceScore: 80,
  confidence: 74,
  impactType: "opportunity",
};

function renderScreen() {
  return render(
    <I18nProvider>
      <MarketNewsScreen />
    </I18nProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  claimsApi.listActive.mockResolvedValue({ claims: [] });
  claimsApi.listRecentlyInvalidated.mockResolvedValue({ claims: [] });
});

describe("MarketNewsScreen (Daily Feed)", () => {
  it("renders real feed items, not the old mock content", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [FEED_ITEM] });
    renderScreen();

    await waitFor(() => expect(screen.getByText(FEED_ITEM.headline)).toBeInTheDocument());
    expect(screen.queryByText("Mock market briefing")).not.toBeInTheDocument();
  });

  it("shows only events at the 8/10 importance threshold and ranks the remaining queue", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({
      feed: [
        { ...FEED_ITEM, headline: "Low-priority item", importanceScore: 79 },
        { ...FEED_ITEM, headline: "Priority item", importanceScore: 91 },
      ],
    });
    renderScreen();

    await waitFor(() => expect(screen.getByText("Priority item")).toBeInTheDocument());
    expect(screen.queryByText("Low-priority item")).not.toBeInTheDocument();
    expect(screen.getByText("Priority calendar")).toBeInTheDocument();
  });

  it("shows an empty state when the feed is empty", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [] });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/No relevant feed items right now/)).toBeInTheDocument());
    expect(screen.getByText(/does not create placeholder events/)).toBeInTheDocument();
  });

  it("shows an error message gracefully on failure", async () => {
    intelligenceApi.liveFeed.mockRejectedValue(new Error("network error"));
    renderScreen();

    await waitFor(() => expect(screen.getByText(/couldn't refresh the feed/)).toBeInTheDocument());
  });

  it("Phase UI-INTEGRATION-001 — shows the honest 'No active Claims affected' state when the item has real affected assets but no claim overlaps", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [{ ...FEED_ITEM, affectedAssets: ["NVDA"] }] });
    renderScreen();

    await waitFor(() => expect(screen.getByText("No active Claims affected.")).toBeInTheDocument());
  });

  it("Phase PRODUCT-001 — shows the honest 'No meaningful impact detected.' state for an item with no affected assets, no holding, and no overlapping claim", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [FEED_ITEM] });
    renderScreen();

    await waitFor(() => expect(screen.getByText("No meaningful impact detected.")).toBeInTheDocument());
  });

  it("Phase UI-INTEGRATION-001 — surfaces a real Changed Claim when a fetched claim overlaps the item's symbols", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [{ ...FEED_ITEM, affectedAssets: ["NVDA"], publishedAt: "2026-07-20T00:00:00.000Z" }] });
    claimsApi.listActive.mockResolvedValue({
      claims: [{ claimId: "c1", status: "STRENGTHENING", symbols: ["NVDA"], plainLanguageStatement: "NVDA bullish claim", lastUpdatedAt: "2026-07-20T06:00:00.000Z" }],
    });
    renderScreen();

    await waitFor(() => expect(screen.getByText(/This news strengthened a Claim: "NVDA bullish claim"/)).toBeInTheDocument());
  });
});
