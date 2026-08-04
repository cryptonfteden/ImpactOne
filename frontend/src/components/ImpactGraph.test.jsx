import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ImpactGraph from "./ImpactGraph";
import { impactGraphApi } from "../services/api";

vi.mock("../services/api", () => ({
  impactGraphApi: { getGraph: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ImpactGraph", () => {
  it("shows an honest empty state, never fabricates a chain, when no real data exists", async () => {
    impactGraphApi.getGraph.mockResolvedValue({ symbol: "ZZZZ", status: "NO_DATA", nodes: [], edges: [], message: "No WorldMemoryRecord mentions ZZZZ yet." });
    render(<ImpactGraph symbol="ZZZZ" />);
    await waitFor(() => expect(screen.getByText("No causal chain recorded yet")).toBeInTheDocument());
    expect(screen.getByText(/No WorldMemoryRecord mentions ZZZZ/)).toBeInTheDocument();
  });

  it("shows an honest 'no links yet' state when real nodes exist but no real edge connects them", async () => {
    impactGraphApi.getGraph.mockResolvedValue({
      symbol: "NVDA",
      status: "NODES_ONLY_NO_LINKS",
      nodes: [{ id: "n1", headline: "NVDA earnings beat" }],
      edges: [],
      message: "NVDA has 1 recorded event(s) but no causal links between them yet — the chain is genuinely unknown, not fabricated.",
    });
    render(<ImpactGraph symbol="NVDA" />);
    await waitFor(() => expect(screen.getByText("Events exist, but no causal chain yet")).toBeInTheDocument());
  });

  it("renders a real causal edge, expandable, with real confidence and evidence", async () => {
    impactGraphApi.getGraph.mockResolvedValue({
      symbol: "NVDA",
      status: "REAL_CHAIN",
      unknownUpstreamCount: 0,
      truncated: false,
      nodes: [
        { id: "cause-1", headline: "Taiwan geopolitical tension rises" },
        { id: "effect-1", headline: "NVDA supply chain risk flagged" },
      ],
      edges: [
        { id: "edge-1", causeRecordId: "cause-1", effectRecordId: "effect-1", explanation: "TSMC fabricates NVDA's chips; Taiwan tension is a real, cited supply risk.", confidence: 62.5 },
      ],
    });
    render(<ImpactGraph symbol="NVDA" />);
    await waitFor(() => expect(screen.getByText("NVDA supply chain risk flagged")).toBeInTheDocument());

    // Collapsed by default — evidence not yet visible.
    expect(screen.queryByText(/TSMC fabricates/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("NVDA supply chain risk flagged"));

    await waitFor(() => expect(screen.getByText(/TSMC fabricates/)).toBeInTheDocument());
    expect(screen.getByText("63% confidence")).toBeInTheDocument();
    expect(screen.getByText("Taiwan geopolitical tension rises")).toBeInTheDocument();
  });

  it("shows an unknown upstream cause explicitly — never inventing one", async () => {
    impactGraphApi.getGraph.mockResolvedValue({
      symbol: "NVDA",
      status: "REAL_CHAIN",
      unknownUpstreamCount: 1,
      truncated: false,
      nodes: [{ id: "effect-1", headline: "NVDA drops on unexplained volume" }],
      edges: [{ id: "edge-1", causeRecordId: null, effectRecordId: "effect-1", explanation: "No confirmed cause identified yet.", confidence: 10 }],
    });
    render(<ImpactGraph symbol="NVDA" />);
    await waitFor(() => expect(screen.getByText("NVDA drops on unexplained volume")).toBeInTheDocument());
    fireEvent.click(screen.getByText("NVDA drops on unexplained volume"));
    await waitFor(() => expect(screen.getByText(/Unknown — no upstream cause recorded yet/)).toBeInTheDocument());
  });

  it("shows a friendly error state when the request fails — never a raw error message", async () => {
    impactGraphApi.getGraph.mockRejectedValue(new Error("graph service down"));
    render(<ImpactGraph symbol="NVDA" />);
    await waitFor(() => expect(screen.getByText("Couldn't load the Impact Graph right now.")).toBeInTheDocument());
    expect(screen.queryByText("graph service down")).not.toBeInTheDocument();
  });
});
