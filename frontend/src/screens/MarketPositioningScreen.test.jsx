import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import MarketPositioningScreen from "./MarketPositioningScreen";
import { marketPositioningApi } from "../services/api";

vi.mock("../services/api", () => ({
  marketPositioningApi: { getPositioning: vi.fn() },
}));

vi.mock("../utils/symbolPanel", () => ({ openSymbolPanel: vi.fn() }));

const POSITIONING_FIXTURE = {
  unavailableFactors: [{ factor: "shortInterest", reason: "No provider." }],
  longPressure: [{ symbol: "NVDA", direction: "LONG_PRESSURE", momentumPct: 8.2, price: 210 }],
  shortPressure: [{ symbol: "XYZ", direction: "SHORT_PRESSURE", momentumPct: -6.1, price: 40 }],
  excludedFromUniverse: [{ symbol: "TINY", reason: "Market cap below the configured floor ($2.0B)." }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MarketPositioningScreen", () => {
  it("renders real long and short pressure rankings from the API, never fabricated", async () => {
    marketPositioningApi.getPositioning.mockResolvedValue(POSITIONING_FIXTURE);
    render(<MarketPositioningScreen />);
    await waitFor(() => expect(screen.getByText("NVDA")).toBeInTheDocument());
    expect(screen.getByText("XYZ")).toBeInTheDocument();
  });

  it("honestly discloses unavailable factors instead of hiding the gap", async () => {
    marketPositioningApi.getPositioning.mockResolvedValue(POSITIONING_FIXTURE);
    render(<MarketPositioningScreen />);
    await waitFor(() => expect(screen.getByText(/Unavailable this session: shortInterest/)).toBeInTheDocument());
  });

  it("shows real exclusion reasons for filtered-out small companies", async () => {
    marketPositioningApi.getPositioning.mockResolvedValue(POSITIONING_FIXTURE);
    render(<MarketPositioningScreen />);
    await waitFor(() => expect(screen.getByText("TINY")).toBeInTheDocument());
    expect(screen.getByText(/Market cap below the configured floor/)).toBeInTheDocument();
  });

  it("shows an honest empty state when nothing ranks", async () => {
    marketPositioningApi.getPositioning.mockResolvedValue({ unavailableFactors: [], longPressure: [], shortPressure: [], excludedFromUniverse: [] });
    render(<MarketPositioningScreen />);
    await waitFor(() => expect(screen.getByText(/No symbols currently show real long pressure/)).toBeInTheDocument());
  });

  it("shows a friendly error state when the request fails — never a raw error message", async () => {
    marketPositioningApi.getPositioning.mockRejectedValue(new Error("service unavailable"));
    render(<MarketPositioningScreen />);
    await waitFor(() => expect(screen.getByText("Couldn't load Market Positioning right now.")).toBeInTheDocument());
    expect(screen.queryByText("service unavailable")).not.toBeInTheDocument();
  });
});
