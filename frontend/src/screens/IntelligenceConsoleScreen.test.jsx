import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import IntelligenceConsoleScreen from "./IntelligenceConsoleScreen";
import { providerApi } from "../services/api";

vi.mock("../services/api", () => ({
  providerApi: { list: vi.fn(), getMetrics: vi.fn(), getDiagnostics: vi.fn(), getMetadata: vi.fn(), run: vi.fn() },
}));

const PROVIDERS_FIXTURE = {
  providers: [
    { providerId: "sec", label: "SEC (EDGAR filings)", sourceType: "regulatory-filing", lastRunAt: null, lastStatus: null, successRate: null },
    { providerId: "reddit", label: "Reddit", sourceType: "social", lastRunAt: "2026-07-13T00:00:00.000Z", lastStatus: "SUCCESS", successRate: 100 },
  ],
};

const METRICS_FIXTURE = { providerId: "sec", totalRuns: 0, totalItemsFetched: 0, totalItemsPersisted: 0, totalItemsDeduped: 0, dedupRate: null, errorRate: null, avgDurationMs: null, lastSuccessAt: null };
const DIAGNOSTICS_FIXTURE = { providerId: "sec", contractValid: true, contractIssues: [], rateLimiter: { maxPerMinute: 10, currentCount: 0, windowResetInMs: 60000 }, lastError: null };
const METADATA_FIXTURE = { providerId: "sec", label: "SEC (EDGAR filings)", sourceType: "regulatory-filing", category: "regulation", defaultThemes: [], rateLimit: { maxPerMinute: 10 } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("IntelligenceConsoleScreen", () => {
  it("renders all providers from the list", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    expect(screen.getByText("Reddit")).toBeInTheDocument();
  });

  it("expands a provider to show metrics, diagnostics, and metadata, fetching each once", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    providerApi.getMetrics.mockResolvedValue(METRICS_FIXTURE);
    providerApi.getDiagnostics.mockResolvedValue(DIAGNOSTICS_FIXTURE);
    providerApi.getMetadata.mockResolvedValue(METADATA_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Show details")[0]);

    await waitFor(() => expect(screen.getByText(/Contract: Valid/)).toBeInTheDocument());
    expect(providerApi.getMetrics).toHaveBeenCalledTimes(1);
    expect(providerApi.getDiagnostics).toHaveBeenCalledTimes(1);
    expect(providerApi.getMetadata).toHaveBeenCalledTimes(1);
  });

  it("triggers a manual run and shows its result", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    providerApi.run.mockResolvedValue({ providerId: "sec", status: "SUCCESS", itemsFetched: 0, itemsPersisted: 0, itemsDeduped: 0 });
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    fireEvent.click(screen.getAllByText("Run now")[0]);

    await waitFor(() => expect(providerApi.run).toHaveBeenCalledWith("sec"));
    await waitFor(() => expect(screen.getByText(/Last manual run: SUCCESS/)).toBeInTheDocument());
  });

  it("never renders a buy/execute/place-order affordance anywhere on this screen", async () => {
    providerApi.list.mockResolvedValue(PROVIDERS_FIXTURE);
    render(<IntelligenceConsoleScreen />);

    await waitFor(() => expect(screen.getByText("SEC (EDGAR filings)")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /buy|place order|execute/i })).not.toBeInTheDocument();
  });
});
