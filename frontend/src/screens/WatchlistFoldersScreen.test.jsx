import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import WatchlistFoldersScreen from "./WatchlistFoldersScreen";
import { watchlistFoldersApi, priceAlertsApi } from "../services/api";

vi.mock("../services/api", () => ({
  watchlistFoldersApi: {
    list: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    addSymbol: vi.fn(),
    removeSymbol: vi.fn(),
    moveSymbol: vi.fn(),
  },
  priceAlertsApi: {
    list: vi.fn(),
    create: vi.fn(),
    deactivate: vi.fn(),
    remove: vi.fn(),
  },
}));

const FOLDER_FIXTURE = {
  id: "folder-1",
  name: "AI",
  items: [{ symbol: "NVDA", addedAt: "2026-07-23T00:00:00.000Z" }],
};

beforeEach(() => {
  vi.clearAllMocks();
  watchlistFoldersApi.list.mockResolvedValue({ folders: [FOLDER_FIXTURE] });
  priceAlertsApi.list.mockResolvedValue({ alerts: [] });
});

describe("WatchlistFoldersScreen", () => {
  it("renders real folders and their symbols from the API", async () => {
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
    expect(screen.getByText("NVDA")).toBeInTheDocument();
  });

  it("shows an honest empty state when no folders exist yet", async () => {
    watchlistFoldersApi.list.mockResolvedValue({ folders: [] });
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("No folders yet")).toBeInTheDocument());
  });

  it("creating a folder calls the real API and refreshes the list", async () => {
    watchlistFoldersApi.create.mockResolvedValue({ id: "folder-2", name: "Long Term", items: [] });
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Folder name (e.g. AI)"), { target: { value: "Long Term" } });
    fireEvent.click(screen.getByText("Create folder"));

    await waitFor(() => expect(watchlistFoldersApi.create).toHaveBeenCalledWith("Long Term"));
    expect(watchlistFoldersApi.list).toHaveBeenCalledTimes(2); // initial + refresh
  });

  it("adding a symbol calls the real API with the normalized symbol", async () => {
    watchlistFoldersApi.addSymbol.mockResolvedValue(FOLDER_FIXTURE);
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Add symbol (e.g. NVDA)"), { target: { value: "pltr" } });
    fireEvent.click(screen.getByText("Add"));

    await waitFor(() => expect(watchlistFoldersApi.addSymbol).toHaveBeenCalledWith("folder-1", "PLTR"));
  });

  it("removing a symbol calls the real API", async () => {
    watchlistFoldersApi.removeSymbol.mockResolvedValue({ ...FOLDER_FIXTURE, items: [] });
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Remove"));

    await waitFor(() => expect(watchlistFoldersApi.removeSymbol).toHaveBeenCalledWith("folder-1", "NVDA"));
  });

  it("opening the alert modal and submitting creates a real alert", async () => {
    priceAlertsApi.create.mockResolvedValue({ id: "alert-1" });
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Set alert"));
    await waitFor(() => expect(screen.getByText("Set a price alert — NVDA")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Target price"), { target: { value: "500" } });
    fireEvent.click(screen.getByText("Create alert"));

    await waitFor(() => expect(priceAlertsApi.create).toHaveBeenCalledWith({ symbol: "NVDA", direction: "ABOVE", targetPrice: 500 }));
  });

  it("renders real active alerts with live current price and status", async () => {
    priceAlertsApi.list.mockResolvedValue({
      alerts: [
        { id: "alert-1", symbol: "AAPL", direction: "ABOVE", targetPrice: 300, status: "ACTIVE", currentPrice: 320, distanceFromTarget: 20, createdAt: "2026-07-23T00:00:00.000Z", triggeredAt: null, triggerPrice: null },
      ],
    });
    render(<WatchlistFoldersScreen />);
    await waitFor(() => expect(screen.getByText("ACTIVE")).toBeInTheDocument());
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });
});
