import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DecisionCenterScreen from "./DecisionCenterScreen";
import { decisionCenterApi } from "../services/api";
import { I18nProvider } from "../i18n/I18nProvider";

vi.mock("../services/api", () => ({
  decisionCenterApi: {
    getDecisions: vi.fn(),
    pin: vi.fn(),
    dismiss: vi.fn(),
    complete: vi.fn(),
    clearStatus: vi.fn(),
  },
}));

vi.mock("../utils/symbolPanel", () => ({ openSymbolPanel: vi.fn() }));

const ITEM = {
  id: "1",
  source: "priceAlert",
  symbol: "AAPL",
  reason: "Alert triggered",
  evidence: "AAPL rose above $300",
  suggestedAction: "Review AAPL",
  priority: "HIGH",
  confidence: 100,
  portfolioImpact: true,
  workspace: "Growth",
  alertState: { activeCount: 1, triggeredCount: 1 },
  status: null,
  timestamp: "2026-07-24T10:00:00.000Z",
};

const FIXTURE = {
  unavailableSources: [{ source: "workspaceActivity", reason: "no log" }, { source: "opportunityScoreMovement", reason: "no history" }],
  items: [ITEM],
  grouped: { priceAlert: [ITEM] },
  counts: { total: 1, high: 1, medium: 0, low: 0 },
  availableSorts: ["urgency", "confidence", "portfolioImpact", "time"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderScreen() {
  return render(<I18nProvider><DecisionCenterScreen /></I18nProvider>);
}

describe("DecisionCenterScreen", () => {
  it("renders real decision items grouped by their real source, including X4's new fields", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());
    expect(screen.getByText("Review AAPL")).toBeInTheDocument();
    expect(screen.getByText("Confidence: 100%")).toBeInTheDocument();
    expect(screen.getByText("Portfolio impact: Held position")).toBeInTheDocument();
    expect(screen.getByText("Workspace: Growth")).toBeInTheDocument();
    expect(screen.getByText("Alerts: 1 active, 1 triggered")).toBeInTheDocument();
  });

  it("honestly discloses unavailable sources", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    renderScreen();
    await waitFor(() => expect(screen.getByText(/Not yet trackable: workspaceActivity/)).toBeInTheDocument());
  });

  it("shows an honest empty state when there are no decisions", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue({ unavailableSources: [], items: [], grouped: {}, counts: { total: 0, high: 0, medium: 0, low: 0 } });
    renderScreen();
    await waitFor(() => expect(screen.getByText("No decisions need your attention right now.")).toBeInTheDocument());
  });

  it("filtering by priority re-requests real filtered data", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "HIGH" }));
    await waitFor(() => expect(decisionCenterApi.getDecisions).toHaveBeenCalledWith({ source: undefined, priority: "HIGH", sortBy: "urgency" }));
  });

  it("choosing a sort re-requests data with the real sortBy", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Confidence" }));
    await waitFor(() => expect(decisionCenterApi.getDecisions).toHaveBeenLastCalledWith({ source: undefined, priority: undefined, sortBy: "confidence" }));
  });

  it("shows a friendly error state on request failure — never a raw error message", async () => {
    decisionCenterApi.getDecisions.mockRejectedValue(new Error("Failed to fetch"));
    renderScreen();
    await waitFor(() => expect(screen.getByText("Couldn't load the Decision Center right now. Try again in a moment.")).toBeInTheDocument());
    expect(screen.queryByText("Failed to fetch")).not.toBeInTheDocument();
  });

  it("pinning an item calls the real pin endpoint and reloads", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    decisionCenterApi.pin.mockResolvedValue();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await waitFor(() => expect(decisionCenterApi.pin).toHaveBeenCalledWith("1"));
    expect(decisionCenterApi.getDecisions).toHaveBeenCalledTimes(2);
  });

  it("marking a pinned item unpins via the real clearStatus endpoint", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue({ ...FIXTURE, items: [{ ...ITEM, status: "PINNED" }], grouped: { priceAlert: [{ ...ITEM, status: "PINNED" }] } });
    decisionCenterApi.clearStatus.mockResolvedValue();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Unpin" }));
    await waitFor(() => expect(decisionCenterApi.clearStatus).toHaveBeenCalledWith("1"));
  });

  it("dismissing an item calls the real dismiss endpoint", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    decisionCenterApi.dismiss.mockResolvedValue();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(decisionCenterApi.dismiss).toHaveBeenCalledWith("1"));
  });

  it("marking an item completed calls the real complete endpoint", async () => {
    decisionCenterApi.getDecisions.mockResolvedValue(FIXTURE);
    decisionCenterApi.complete.mockResolvedValue();
    renderScreen();
    await waitFor(() => expect(screen.getByText("Alert triggered")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    await waitFor(() => expect(decisionCenterApi.complete).toHaveBeenCalledWith("1"));
  });
});
