import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ThemeDashboardScreen from "./ThemeDashboardScreen";
import { themeApi } from "../services/api";

vi.mock("../services/api", () => ({
  themeApi: { list: vi.fn(), get: vi.fn(), getEvolution: vi.fn(), recordView: vi.fn() },
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

const AI_EVOLUTION_FIXTURE = {
  themeKey: "ai",
  label: "AI",
  whatsNew: ["AI capex surge"],
  strengthened: true,
  weakened: false,
  disappeared: false,
  confidenceDelta: 5,
  currentConfidence: 75,
  previousConfidence: 70,
  hasComparison: true,
  why: "AI shows strong recent signal.",
};

beforeEach(() => {
  vi.clearAllMocks();
  themeApi.getEvolution.mockResolvedValue(AI_EVOLUTION_FIXTURE);
  themeApi.recordView.mockResolvedValue({ id: "evt-1" });
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

  it("Sprint 29 — shows theme evolution (what's new, strengthened/weakened, why) when expanded", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);

    await waitFor(() => expect(screen.getByText("Theme evolution")).toBeInTheDocument());
    expect(screen.getByText(/What's new: AI capex surge/)).toBeInTheDocument();
    expect(screen.getByText(/Strengthened: confidence 70 → 75 \(\+5\)/)).toBeInTheDocument();
    expect(themeApi.getEvolution).toHaveBeenCalledWith("ai");
  });

  it("Sprint 29 — honestly shows 'not enough history yet' when the theme has fewer than two snapshots", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    themeApi.getEvolution.mockResolvedValue({ ...AI_EVOLUTION_FIXTURE, hasComparison: false, confidenceDelta: null, strengthened: false, weakened: false });
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);

    await waitFor(() => expect(screen.getByText(/Not enough history yet/)).toBeInTheDocument());
  });

  it("Sprint 30 — records a real theme view event on expand, never on collapse", async () => {
    themeApi.list.mockResolvedValue(THEMES_FIXTURE);
    themeApi.get.mockResolvedValue(AI_DETAIL_FIXTURE);
    render(<ThemeDashboardScreen />);

    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    expect(themeApi.recordView).not.toHaveBeenCalled();

    const toggle = screen.getAllByText("Show details")[0];
    fireEvent.click(toggle);
    await waitFor(() => expect(themeApi.recordView).toHaveBeenCalledWith("ai"));
    expect(themeApi.recordView).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Hide details"));
    expect(themeApi.recordView).toHaveBeenCalledTimes(1);
  });
});
