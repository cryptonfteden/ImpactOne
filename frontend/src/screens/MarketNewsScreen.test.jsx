import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarketNewsScreen from "./MarketNewsScreen";
import { intelligenceApi } from "../services/api";

vi.mock("../services/api", () => ({
  intelligenceApi: { liveFeed: vi.fn() },
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MarketNewsScreen (Daily Feed)", () => {
  it("renders real feed items, not the old mock content", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [FEED_ITEM] });
    render(<MarketNewsScreen />);

    await waitFor(() => expect(screen.getByText(FEED_ITEM.headline)).toBeInTheDocument());
    expect(screen.queryByText("Mock market briefing")).not.toBeInTheDocument();
  });

  it("shows an empty state when the feed is empty", async () => {
    intelligenceApi.liveFeed.mockResolvedValue({ feed: [] });
    render(<MarketNewsScreen />);

    await waitFor(() => expect(screen.getByText(/No feed items right now/)).toBeInTheDocument());
  });

  it("shows an error message gracefully on failure", async () => {
    intelligenceApi.liveFeed.mockRejectedValue(new Error("network error"));
    render(<MarketNewsScreen />);

    await waitFor(() => expect(screen.getByText(/couldn't refresh the feed/)).toBeInTheDocument());
  });
});
