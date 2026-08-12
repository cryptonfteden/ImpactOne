import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Header from "./Header";
import { intelligenceApi, chatApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";

function renderHeader(props) {
  return render(<I18nProvider><Header {...props} /></I18nProvider>);
}

vi.mock("../services/api", () => ({
  intelligenceApi: { liveFeed: vi.fn() },
  chatApi: { ask: vi.fn() },
}));

vi.mock("../hooks/usePortfolioEngine", () => ({
  default: () => ({ summary: { totalValue: 100000, dailyPnl: 0 } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  intelligenceApi.liveFeed.mockResolvedValue({ alerts: [] });
});

describe("Header search", () => {
  it("shows the integrated language selector with the honest Hebrew availability state", async () => {
    renderHeader();
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Choose display language" }));

    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText(/עברית.*בקרוב/)).toBeInTheDocument();
  });

  it("keeps focus on search without opening a default list of stock symbols", async () => {
    renderHeader({ watchlist: ["AAPL", "NVDA"] });
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.focus(screen.getByLabelText("Search a ticker or ask a market question"));

    expect(screen.queryByRole("button", { name: "AAPL" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "NVDA" })).not.toBeInTheDocument();
  });

  it("Sprint 40 — a plain ticker submission still calls onQuickSearch, never the chat endpoint", async () => {
    const onQuickSearch = vi.fn();
    renderHeader({ onQuickSearch });
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Search a ticker or ask a market question"), { target: { value: "NVDA" } });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    expect(onQuickSearch).toHaveBeenCalledWith("NVDA");
    expect(chatApi.ask).not.toHaveBeenCalled();
  });

  it("Sprint 40 — a natural-language question is routed to conversational search, not treated as a ticker", async () => {
    const onQuickSearch = vi.fn();
    chatApi.ask.mockResolvedValue({ answer: "Nvidia's committee currently leans supportive on technical evidence." });
    renderHeader({ onQuickSearch });
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Search a ticker or ask a market question"), { target: { value: "Should I buy Nvidia?" } });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    await waitFor(() => expect(screen.getByText(/Nvidia's committee currently leans supportive/)).toBeInTheDocument());
    expect(onQuickSearch).not.toHaveBeenCalled();
    expect(chatApi.ask).toHaveBeenCalledWith({ question: "Should I buy Nvidia?" });
  });

  it("Sprint 40 — a failed conversational search shows an honest error, never a fabricated answer", async () => {
    chatApi.ask.mockRejectedValue(new Error("network down"));
    renderHeader();
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Search a ticker or ask a market question"), { target: { value: "What changed overnight?" } });
    fireEvent.click(screen.getByRole("button", { name: "Run search" }));

    await waitFor(() => expect(screen.getByText(/Couldn't get an answer right now/)).toBeInTheDocument());
  });
});
