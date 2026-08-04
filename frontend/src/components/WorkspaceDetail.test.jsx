import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import WorkspaceDetail from "./WorkspaceDetail";
import { workspaceApi, impactGraphApi, watchlistFoldersApi } from "../services/api";

vi.mock("../services/api", () => ({
  workspaceApi: { get: vi.fn(), addNote: vi.fn(), getDecisionHistory: vi.fn() },
  impactGraphApi: { getGraph: vi.fn(), getWorkspaceGraph: vi.fn() },
  watchlistFoldersApi: { setItemFlags: vi.fn() },
}));

const WORKSPACE_FIXTURE = {
  folder: { id: "f1", name: "AI", createdAt: "2026-07-01T00:00:00.000Z", items: [{ symbol: "NVDA", addedAt: "2026-07-01T00:00:00.000Z", pinned: false, priority: false, aiFocus: false }] },
  notes: [],
  timeline: [{ type: "SYMBOL_ADDED", symbol: "NVDA", timestamp: "2026-07-01T00:00:00.000Z" }],
  recentActivity: [{ type: "SYMBOL_ADDED", symbol: "NVDA", timestamp: "2026-07-01T00:00:00.000Z" }],
  health: { trackedSymbolCount: 1, longPressureCount: 1, shortPressureCount: 0, undirectedCount: 0, recentTriggerCount: 0, dataAvailable: true },
  summary: { trackedSymbolCount: 1, pinnedCount: 0, priorityCount: 0, aiFocusCount: 0 },
  performance: { avgMomentumPct: 1.5, symbolsWithData: 1, symbolsWithoutData: 0 },
  alertSummary: { activeCount: 0, triggeredCount: 0 },
  impactSummary: { symbolsWithChain: 0, symbolsWithNoData: 1, edgeCount: 0 },
  knownGaps: [{ gap: "assetTypeDistinction", reason: "No assetType column exists yet." }],
};

beforeEach(() => {
  vi.clearAllMocks();
  workspaceApi.get.mockResolvedValue(WORKSPACE_FIXTURE);
  workspaceApi.getDecisionHistory.mockResolvedValue({ items: [] });
  impactGraphApi.getGraph.mockResolvedValue({ symbol: "NVDA", status: "NO_DATA", nodes: [], edges: [], message: "No data yet." });
  impactGraphApi.getWorkspaceGraph.mockResolvedValue({ status: "NO_DATA", nodes: [], edges: [], message: "No data yet." });
  watchlistFoldersApi.setItemFlags.mockResolvedValue(WORKSPACE_FIXTURE.folder);
});

describe("WorkspaceDetail", () => {
  it("renders the real workspace name and real Workspace Health", async () => {
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    expect(screen.getByText("Tracked symbols")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0); // real counts (tracked/long pressure both real 1s)
  });

  it("shows the real known gap disclosure, never hiding a real limitation", async () => {
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/No assetType column exists yet/)).toBeInTheDocument());
  });

  it("switching to the Notes tab and adding a note calls the real API and refreshes", async () => {
    workspaceApi.addNote.mockResolvedValue({ id: "n1", text: "Watching for entry", isAiNote: false });
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Notes"));
    fireEvent.change(screen.getByPlaceholderText("Add a note"), { target: { value: "Watching for entry" } });
    fireEvent.click(screen.getByText("Add note"));

    await waitFor(() => expect(workspaceApi.addNote).toHaveBeenCalledWith("f1", "Watching for entry"));
  });

  it("switching to the Impact Graph tab shows the real per-symbol graph", async () => {
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Impact Graph"));
    await waitFor(() => expect(impactGraphApi.getGraph).toHaveBeenCalledWith("NVDA"));
  });

  it("shows an honest empty health state with zero tracked symbols", async () => {
    workspaceApi.get.mockResolvedValue({
      ...WORKSPACE_FIXTURE,
      folder: { ...WORKSPACE_FIXTURE.folder, items: [] },
      health: null,
      summary: { trackedSymbolCount: 0, pinnedCount: 0, priorityCount: 0, aiFocusCount: 0 },
      performance: null,
      alertSummary: { activeCount: 0, triggeredCount: 0 },
      impactSummary: null,
      timeline: [],
      recentActivity: [],
    });
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/health can't be computed honestly/)).toBeInTheDocument());
  });

  it("pinning a symbol calls the real setItemFlags endpoint and refreshes", async () => {
    render(<WorkspaceDetail folderId="f1" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Pin" }));
    await waitFor(() => expect(watchlistFoldersApi.setItemFlags).toHaveBeenCalledWith("f1", "NVDA", { pinned: true }));
  });

  it("close button calls onClose", async () => {
    const onClose = vi.fn();
    render(<WorkspaceDetail folderId="f1" onClose={onClose} />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
