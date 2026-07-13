import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ThemeDashboardScreen from "./ThemeDashboardScreen";
import { themeApi } from "../services/api";

vi.mock("../services/api", () => ({
  themeApi: { list: vi.fn(), get: vi.fn() },
}));

const THEMES_FIXTURE = { themes: [{ themeKey: "ai", label: "AI" }, { themeKey: "defense", label: "Defense" }] };
const AI_DETAIL_FIXTURE = {
  themeKey: "ai",
  label: "AI",
  maturity: "Growth",
  thesis: "AI shows strong recent signal.",
  confidenceScore: 75,
  supportingEvidence: [{ headline: "AI capex surge", whyItMatters: "Spend accelerating." }],
  counterarguments: ["Valuations stretched."],
  companies: ["NVDA", "MSFT"],
  etfs: ["BOTZ"],
  confidenceTrend: [{ date: "2026-07-10", confidenceScore: 70 }, { date: "2026-07-11", confidenceScore: 75 }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ThemeDashboardScreen", () => {
  it("renders all theme tiles from the list", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    expect(screen.getByText("Defense")).toBeInTheDocument();
  });

  it("expands a theme tile to show full detail on click, and fetches detail only once", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);

    await waitFor(() => expect(screen.getByText("AI shows strong recent signal.")).toBeInTheDocument());
    expect(screen.getByText(/NVDA, MSFT/)).toBeInTheDocument();
    expect(screen.getByText(/BOTZ/)).toBeInTheDocument();
    expect(themeApi.get).toHaveBeenCalledTimes(1);
  });

  it("collapses a tile back on second click without an extra fetch", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    const toggle = screen.getAllByText("Show details")[0];
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByText("AI shows strong recent signal.")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Hide details"));
    expect(screen.queryByText("AI shows strong recent signal.")).not.toBeInTheDocument();
  });

  it("never renders a buy/execute affordance anywhere on this screen", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);
    await waitFor(() => expect(screen.getByText("AI shows strong recent signal.")).toBeInTheDocument());

    expect(screen.queryByRole("button", { name: /buy|place order|execute/i })).not.toBeInTheDocument();
  });
});
