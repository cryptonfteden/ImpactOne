import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import IntelligenceWorkspaceScreen from "./IntelligenceWorkspaceScreen";
import { intelligenceApi, watchlistFoldersApi, priceAlertsApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";

function renderScreen() {
  return render(
    <I18nProvider>
      <IntelligenceWorkspaceScreen />
    </I18nProvider>
  );
}

vi.mock("../services/api", () => ({
  intelligenceApi: { overview: vi.fn() },
  watchlistFoldersApi: { list: vi.fn() },
  priceAlertsApi: { list: vi.fn() },
}));

vi.mock("../hooks/useWatchlist", () => ({
  default: () => ({ watchlist: ["NVDA"], addTicker: vi.fn(), removeTicker: vi.fn(), toggleTicker: vi.fn() }),
}));

vi.mock("../utils/pollWhileVisible", () => ({
  startVisibilityAwarePolling: () => () => {},
}));

const FEED_WITH_EVENTS = [
  {
    id: "evt-1",
    headline: "Fed signals rate pause",
    whyItMatters: "Markets read this as dovish, reducing near-term downside risk.",
    sourceName: "Reuters",
    publishedAt: "2026-07-20T09:00:00.000Z",
    confidence: 78,
    importanceScore: 92,
    riskLevel: "high",
    impactType: "opportunity",
    timeHorizon: "1-3 days",
    reliability: "high",
    affectedSectors: ["Financials", "Technology"],
    marketImpactPrediction: "Broad risk-on move likely across rate-sensitive sectors.",
    explainability: {
      reasoning: "The statement removed prior tightening language.",
      evidence: ["FOMC statement text", "Futures market repricing"],
      counterarguments: ["Inflation print next week could reverse this read."],
      invalidationSignals: ["A hot CPI print above consensus."],
    },
  },
  {
    id: "evt-2",
    headline: "Oil supply disruption reported",
    whyItMatters: "Energy input costs may rise for manufacturers.",
    sourceName: "Bloomberg",
    publishedAt: "2026-07-20T07:00:00.000Z",
    confidence: 55,
    importanceScore: 60,
    riskLevel: "medium",
    impactType: "risk",
    timeHorizon: "1 week",
    reliability: "medium",
    affectedSectors: ["Energy"],
    marketImpactPrediction: "Higher input costs pressure industrial margins.",
    explainability: {
      reasoning: "Shipping data shows a real capacity drop.",
      evidence: ["Shipping manifests"],
      counterarguments: [],
      invalidationSignals: [],
    },
  },
];

const OVERVIEW_WITH_EVENTS = { feed: FEED_WITH_EVENTS, globalMap: {}, generatedAt: "2026-07-20T09:05:00.000Z" };
const OVERVIEW_EMPTY = { feed: [], globalMap: {}, generatedAt: "2026-07-20T09:05:00.000Z" };

beforeEach(() => {
  vi.clearAllMocks();
  watchlistFoldersApi.list.mockResolvedValue({ folders: [] });
  priceAlertsApi.list.mockResolvedValue({ alerts: [] });
});

describe("IntelligenceWorkspaceScreen", () => {
  it("renders all 7 required sections once data loads", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    renderScreen();

    await waitFor(() => expect(screen.getByText("The AI intelligence desk for global markets")).toBeInTheDocument());
    expect(screen.getByRole("region", { name: "Intelligence Brief" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Priority Events" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Market Impact Map" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Source Evidence" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI Analysis" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Recent Intelligence" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Saved / Tracked Items" })).toBeInTheDocument();
  });

  it("Intelligence Brief shows the real top event's confidence, freshness, and market implication", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    renderScreen();

    await waitFor(() => expect(screen.getByText(/Markets read this as dovish/)).toBeInTheDocument());
    const briefRegion = screen.getByRole("region", { name: "Intelligence Brief" });
    expect(within(briefRegion).getByText(/78\/100/)).toBeInTheDocument();
    expect(within(briefRegion).getByText(/Broad risk-on move likely/)).toBeInTheDocument();
  });

  it("Priority Events ranks by importance and shows severity, sectors, direction, and horizon", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    renderScreen();

    const priorityRegion = await screen.findByRole("region", { name: "Priority Events" });
    await waitFor(() => expect(within(priorityRegion).getByText("Fed signals rate pause")).toBeInTheDocument());
    const rows = within(priorityRegion).getAllByRole("row");
    // header row + 2 event rows, Fed event (importance 92) ranked above Oil event (60)
    expect(rows.length).toBe(3);
    expect(rows[1]).toHaveTextContent("Fed signals rate pause");
    expect(rows[1]).toHaveTextContent("high");
    expect(rows[1]).toHaveTextContent("Financials");
    expect(rows[1]).toHaveTextContent("1-3 days");
  });

  it("AI Analysis shows reasoning, uncertainty derived from confidence, counter-scenario, and invalidation signals", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    renderScreen();

    await waitFor(() => expect(screen.getByText("The statement removed prior tightening language.")).toBeInTheDocument());
    expect(screen.getByText(/22\/100/)).toBeInTheDocument();
    expect(screen.getByText(/Inflation print next week could reverse this read/)).toBeInTheDocument();
    expect(screen.getByText(/A hot CPI print above consensus/)).toBeInTheDocument();
  });

  it("Recent Intelligence filters client-side by impact type without a new fetch", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    renderScreen();

    const recentRegion = await screen.findByRole("region", { name: "Recent Intelligence" });
    await waitFor(() => expect(within(recentRegion).getByText("Oil supply disruption reported")).toBeInTheDocument());
    expect(intelligenceApi.overview).toHaveBeenCalledTimes(1);

    fireEvent.click(within(recentRegion).getByRole("tab", { name: "Risk" }));
    expect(within(recentRegion).getByText("Oil supply disruption reported")).toBeInTheDocument();
    expect(within(recentRegion).queryByText("Fed signals rate pause")).not.toBeInTheDocument();
    expect(intelligenceApi.overview).toHaveBeenCalledTimes(1);
  });

  it("shows honest empty states across every section when there's no feed data", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_EMPTY);
    renderScreen();

    await waitFor(() => expect(screen.getByText("No intelligence brief available right now.")).toBeInTheDocument());
    expect(screen.getByText("No priority events right now.")).toBeInTheDocument();
    expect(screen.getByText("No sector impact data right now.")).toBeInTheDocument();
    expect(screen.getByText("No source evidence available right now.")).toBeInTheDocument();
    expect(screen.getByText("No AI analysis available right now.")).toBeInTheDocument();
  });

  it("Saved / Tracked Items shows the real honest empty state when there are no folders or alerts", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_EMPTY);
    renderScreen();

    await waitFor(() => expect(screen.getByText(/Nothing saved or tracked yet/)).toBeInTheDocument());
  });

  it("Saved / Tracked Items lists real folders and alerts when they exist", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_EMPTY);
    watchlistFoldersApi.list.mockResolvedValue({ folders: [{ id: "f1", name: "Core Holdings", items: [{ symbol: "NVDA" }, { symbol: "AAPL" }] }] });
    priceAlertsApi.list.mockResolvedValue({ alerts: [{ id: "a1", symbol: "NVDA", direction: "ABOVE", targetPrice: 150, status: "ACTIVE" }] });
    renderScreen();

    await waitFor(() => expect(screen.getByText("Core Holdings")).toBeInTheDocument());
    expect(screen.getByText(/2 symbol\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument();
  });

  it("shows the noCachedFallback message when the initial load fails with no prior data", async () => {
    intelligenceApi.overview.mockRejectedValue(new Error("network down"));
    renderScreen();

    await waitFor(() => expect(screen.getByText(/We couldn't refresh the Intelligence Workspace/)).toBeInTheDocument());
    expect(screen.getByText(/Nothing has loaded yet, so there's no cached view to fall back to/)).toBeInTheDocument();
  });

  it("no legacy UI classes remain in Intelligence Workspace", async () => {
    intelligenceApi.overview.mockResolvedValue(OVERVIEW_WITH_EVENTS);
    const { container } = renderScreen();

    await waitFor(() => expect(screen.getByText("The AI intelligence desk for global markets")).toBeInTheDocument());
    expect(container.querySelectorAll(".company-description, .eyebrow, .ghost-button, .pill")).toHaveLength(0);
  });
});
