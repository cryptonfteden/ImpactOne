import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import DecisionTimelineScreen from "./DecisionTimelineScreen";
import { decisionTimelineApi } from "../services/api";
import { hasStoredBetaIdentity } from "../hooks/useBetaIdentity";

vi.mock("../services/api", () => ({
  decisionTimelineApi: { get: vi.fn() },
}));

vi.mock("../utils/symbolPanel", () => ({ openSymbolPanel: vi.fn() }));
vi.mock("../hooks/useBetaIdentity", () => ({ hasStoredBetaIdentity: vi.fn(() => true) }));

const FIXTURE = {
  unavailableSources: [{ source: "marketPositioningChanges", reason: "no history" }, { source: "opportunityScoreChanges", reason: "no history" }],
  events: [
    { type: "ALERT", timestamp: "2026-07-24T10:00:00.000Z", symbol: "AAPL", text: "AAPL rose above target." },
    { type: "WORKSPACE_ACTIVITY", timestamp: "2026-07-24T09:00:00.000Z", symbol: "NVDA", text: 'Added to "AI"' },
  ],
  counts: { ALERT: 1, WORKSPACE_ACTIVITY: 1 },
};

beforeEach(() => {
  vi.clearAllMocks();
  hasStoredBetaIdentity.mockReturnValue(true);
});

describe("DecisionTimelineScreen", () => {
  it("shows a valid empty state for a guest without calling a private endpoint", async () => {
    hasStoredBetaIdentity.mockReturnValue(false);
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText(/No events yet/)).toBeInTheDocument());
    expect(decisionTimelineApi.get).not.toHaveBeenCalled();
  });

  it("renders real merged events from every real source", async () => {
    decisionTimelineApi.get.mockResolvedValue(FIXTURE);
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText("AAPL rose above target.")).toBeInTheDocument());
    expect(screen.getByText('Added to "AI"')).toBeInTheDocument();
  });

  it("honestly discloses unavailable sources", async () => {
    decisionTimelineApi.get.mockResolvedValue(FIXTURE);
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText(/Not yet trackable: marketPositioningChanges/)).toBeInTheDocument());
  });

  it("shows an honest empty state with no events", async () => {
    decisionTimelineApi.get.mockResolvedValue({ unavailableSources: [], events: [], counts: {} });
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText(/No events yet/)).toBeInTheDocument());
  });

  it("filtering by type shows only matching events, client-side", async () => {
    decisionTimelineApi.get.mockResolvedValue(FIXTURE);
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText("AAPL rose above target.")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Alert" }));
    expect(screen.getByText("AAPL rose above target.")).toBeInTheDocument();
    expect(screen.queryByText('Added to "AI"')).not.toBeInTheDocument();
  });

  it("shows a friendly error state with a real retry action on failure", async () => {
    decisionTimelineApi.get.mockRejectedValueOnce(new Error("Failed to fetch"));
    render(<DecisionTimelineScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't load the Decision Timeline right now.")).toBeInTheDocument());

    decisionTimelineApi.get.mockResolvedValueOnce(FIXTURE);
    fireEvent.click(screen.getByText("Try again"));
    await waitFor(() => expect(screen.getByText("AAPL rose above target.")).toBeInTheDocument());
  });
});
