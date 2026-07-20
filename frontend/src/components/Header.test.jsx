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
  it("Sprint 40 — a plain ticker submission still calls onQuickSearch, never the chat endpoint", async () => {
    const onQuickSearch = vi.fn();
    renderHeader({ onQuickSearch });
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Ask about a ticker/i), { target: { value: "NVDA" } });
    fireEvent.click(screen.getByText("Go"));

    expect(onQuickSearch).toHaveBeenCalledWith("NVDA");
    expect(chatApi.ask).not.toHaveBeenCalled();
  });

  it("Sprint 40 — a natural-language question is routed to conversational search, not treated as a ticker", async () => {
    const onQuickSearch = vi.fn();
    chatApi.ask.mockResolvedValue({ answer: "Nvidia's committee currently leans supportive on technical evidence." });
    renderHeader({ onQuickSearch });
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Ask about a ticker/i), { target: { value: "Should I buy Nvidia?" } });
    fireEvent.click(screen.getByText("Go"));

    await waitFor(() => expect(screen.getByText(/Nvidia's committee currently leans supportive/)).toBeInTheDocument());
    expect(onQuickSearch).not.toHaveBeenCalled();
    expect(chatApi.ask).toHaveBeenCalledWith({ question: "Should I buy Nvidia?" });
  });

  it("Sprint 40 — a failed conversational search shows an honest error, never a fabricated answer", async () => {
    chatApi.ask.mockRejectedValue(new Error("network down"));
    renderHeader();
    await waitFor(() => expect(intelligenceApi.liveFeed).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText(/Ask about a ticker/i), { target: { value: "What changed overnight?" } });
    fireEvent.click(screen.getByText("Go"));

    await waitFor(() => expect(screen.getByText(/Couldn't get an answer right now/)).toBeInTheDocument());
  });
});
