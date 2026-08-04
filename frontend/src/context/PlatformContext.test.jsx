import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PlatformProvider, usePlatformContext } from "./PlatformContext";
import { portfolioEngineApi } from "../services/api";
import { clearRequestCache } from "../services/requestCache";

vi.mock("../services/api", () => ({
  portfolioEngineApi: { getSummary: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  clearRequestCache();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function Probe() {
  const { selectedClaim, selectClaim, selectedSymbol, selectSymbol, portfolioContext, portfolioContextStatus, loadPortfolioContext, navigateTo } =
    usePlatformContext();
  return (
    <div>
      <span data-testid="claim">{selectedClaim?.claimId || "none"}</span>
      <span data-testid="symbol">{selectedSymbol || "none"}</span>
      <span data-testid="portfolio-status">{portfolioContextStatus}</span>
      <span data-testid="portfolio-value">{portfolioContext?.totalValue ?? "none"}</span>
      <button onClick={() => selectClaim({ claimId: "c1", symbols: ["NVDA"] })}>select claim</button>
      <button onClick={() => selectSymbol("META")}>select symbol</button>
      <button onClick={() => loadPortfolioContext()}>load portfolio</button>
      <button onClick={() => navigateTo("Portfolio Workspace", { claim: { claimId: "c2", symbols: ["MSFT"] } })}>navigate with claim</button>
    </div>
  );
}

function renderProbe(navigate = vi.fn()) {
  const utils = render(
    <PlatformProvider navigate={navigate}>
      <Probe />
    </PlatformProvider>
  );
  return { ...utils, navigate };
}

describe("PlatformContext", () => {
  it("throws when used outside a PlatformProvider", () => {
    function Bare() {
      usePlatformContext();
      return null;
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Bare />)).toThrow("usePlatformContext must be used within a PlatformProvider");
  });

  it("starts with no selected claim or symbol", () => {
    renderProbe();
    expect(screen.getByTestId("claim")).toHaveTextContent("none");
    expect(screen.getByTestId("symbol")).toHaveTextContent("none");
  });

  it("selecting a claim also sets its first symbol as the selected symbol", () => {
    renderProbe();
    fireEvent.click(screen.getByText("select claim"));
    expect(screen.getByTestId("claim")).toHaveTextContent("c1");
    expect(screen.getByTestId("symbol")).toHaveTextContent("NVDA");
  });

  it("selecting a symbol directly does not require a claim", () => {
    renderProbe();
    fireEvent.click(screen.getByText("select symbol"));
    expect(screen.getByTestId("symbol")).toHaveTextContent("META");
    expect(screen.getByTestId("claim")).toHaveTextContent("none");
  });

  it("navigateTo sets the claim and calls the shared navigate function", () => {
    const navigate = vi.fn();
    renderProbe(navigate);
    fireEvent.click(screen.getByText("navigate with claim"));
    expect(screen.getByTestId("claim")).toHaveTextContent("c2");
    expect(navigate).toHaveBeenCalledWith("Portfolio Workspace");
  });

  it("loadPortfolioContext fetches once and shares the cached result across calls", async () => {
    portfolioEngineApi.getSummary.mockResolvedValue({ totalValue: 50000 });
    renderProbe();

    fireEvent.click(screen.getByText("load portfolio"));
    await waitFor(() => expect(screen.getByTestId("portfolio-status")).toHaveTextContent("loaded"));
    expect(screen.getByTestId("portfolio-value")).toHaveTextContent("50000");

    fireEvent.click(screen.getByText("load portfolio"));
    await waitFor(() => expect(screen.getByTestId("portfolio-status")).toHaveTextContent("loaded"));
    expect(portfolioEngineApi.getSummary).toHaveBeenCalledTimes(1);
  });

  it("a failed portfolio load sets an honest error status instead of throwing", async () => {
    portfolioEngineApi.getSummary.mockRejectedValue(new Error("down"));
    renderProbe();

    fireEvent.click(screen.getByText("load portfolio"));
    await waitFor(() => expect(screen.getByTestId("portfolio-status")).toHaveTextContent("error"));
    expect(screen.getByTestId("portfolio-value")).toHaveTextContent("none");
  });
});
