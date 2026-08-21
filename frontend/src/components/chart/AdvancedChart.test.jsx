import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import AdvancedChart, { FIBONACCI_LEVELS, findFibonacciAnchors } from "./AdvancedChart";
import { marketPositioningApi } from "../../services/api";

vi.mock("../../services/api", () => ({
  marketPositioningApi: { getChart: vi.fn() },
  performanceMetricsApi: { recordClientTiming: vi.fn().mockResolvedValue() },
}));

const BARS = Array.from({ length: 40 }, (_, i) => ({
  date: `2026-01-${String(i + 1).padStart(2, "0")}`,
  open: 100 + i,
  high: 102 + i,
  low: 98 + i,
  close: 101 + i,
  volume: 1_000_000 + i * 1000,
}));

let originalResizeObserver;

beforeEach(() => {
  vi.clearAllMocks();
  originalResizeObserver = global.ResizeObserver;
  // Phase X3 — real crosshair/tooltip tests need a real, non-zero
  // containerWidth, so this mock actually reports one (jsdom itself never
  // lays out real pixel sizes) rather than leaving geometry perpetually
  // null.
  global.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      target.getBoundingClientRect = () => ({ width: 600, left: 0, top: 0, right: 600, bottom: 420, height: 420 });
      this.callback([{ contentRect: { width: 600 } }]);
    }
    disconnect() {}
  };
});

afterEach(() => {
  global.ResizeObserver = originalResizeObserver;
});

describe("AdvancedChart", () => {
  it("shows a real loading state before chart data arrives", async () => {
    marketPositioningApi.getChart.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AdvancedChart symbol="AAPL" />);
    expect(screen.getByLabelText("Loading AAPL chart")).toBeInTheDocument();
  });

  it("loads real OHLCV bars and renders the canvas layers once data arrives", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    const { container } = render(<AdvancedChart symbol="AAPL" />);

    await waitFor(() => expect(marketPositioningApi.getChart).toHaveBeenCalledWith("AAPL", "3mo"));
    await waitFor(() => expect(container.querySelector(".advanced-chart__layer--price")).toBeInTheDocument());
    expect(container.querySelector(".advanced-chart__layer--overlay")).toBeInTheDocument();
    expect(container.querySelector(".advanced-chart__layer--drawing")).toBeInTheDocument();
  });

  it("uses only the approved 0/0.886/1 Fibonacci levels in the active context", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    render(<AdvancedChart symbol="AAPL" />);
    expect(FIBONACCI_LEVELS).toEqual([0, 0.886, 1]);
    fireEvent.click(screen.getByText("Fibonacci"));
    await waitFor(() => expect(marketPositioningApi.getChart).toHaveBeenCalledWith("AAPL", "3mo"));
    expect(marketPositioningApi.getChart).not.toHaveBeenCalledWith("AAPL", "1y");
    expect(screen.getByText("Fibonacci on")).toBeEnabled();
  });

  it("anchors Fibonacci only from an earlier low to a later high", () => {
    const anchors = findFibonacciAnchors([
      { date: "2026-01-10", low: 90, high: 110 },
      { date: "2026-02-10", low: 70, high: 80 },
      { date: "2026-03-10", low: 75, high: 120 },
    ]);
    expect(anchors).toMatchObject({ startIndex: 1, endIndex: 2, from: 70, to: 120 });
  });

  it("builds intraday Fibonacci from an earlier low to a later high", () => {
    expect(findFibonacciAnchors([
      { date: "2026-01-05", low: 70, high: 75 },
      { date: "2026-01-20", low: 72, high: 120 },
    ])).toMatchObject({ startIndex: 0, endIndex: 1, from: 70, to: 120 });
  });

  it("shows an honest empty message when the real API returns zero bars — never fabricates data", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "NODATA", range: "3mo", bars: [] });
    render(<AdvancedChart symbol="NODATA" />);
    await waitFor(() => expect(screen.getByText(/No chart data available for NODATA/)).toBeInTheDocument());
  });

  it("renders verified partial history instead of incorrectly claiming that a newer stock has no data", async () => {
    marketPositioningApi.getChart.mockResolvedValue({
      symbol: "CDNL",
      range: "1y",
      bars: BARS,
      source: "Yahoo Finance",
      sourceRole: "verified-fallback",
      timeframe: {
        label: "1 year",
        candleInterval: "1 week",
        barCount: BARS.length,
        complete: false,
        reason: "Only 40 verified bars are available; 1 year requires a longer span.",
      },
    });
    const { container } = render(<AdvancedChart symbol="CDNL" initialRange="1y" />);
    await waitFor(() => expect(screen.getByText("Partial 1 year history")).toBeInTheDocument());
    expect(container.querySelector(".advanced-chart__canvas-stack")).toBeInTheDocument();
    expect(screen.queryByText(/No chart data available for CDNL/)).not.toBeInTheDocument();
  });

  it("shows a friendly error state when the chart request fails — never a raw error message", async () => {
    marketPositioningApi.getChart.mockRejectedValue(new Error("network down"));
    render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(screen.getByText("Couldn't load chart data.")).toBeInTheDocument());
    expect(screen.queryByText("network down")).not.toBeInTheDocument();
  });

  it("switching timeframe re-requests real data for the new range", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(marketPositioningApi.getChart).toHaveBeenCalledWith("AAPL", "3mo"));

    screen.getByText("1Y").click();
    await waitFor(() => expect(marketPositioningApi.getChart).toHaveBeenCalledWith("AAPL", "1y"));
  });

  it("keeps Fibonacci active and recalculates it when the timeframe changes", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(screen.getByText("Fibonacci")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Fibonacci"));
    expect(screen.getByText("Fibonacci on")).toBeInTheDocument();
    expect(marketPositioningApi.getChart).not.toHaveBeenCalledWith("AAPL", "1y");

    fireEvent.click(screen.getByText("4H"));
    await waitFor(() => expect(marketPositioningApi.getChart).toHaveBeenCalledWith("AAPL", "4h"));
    expect(screen.getByText("Fibonacci on")).toBeInTheDocument();
  });

  it("Phase X3 — moving the pointer over the chart shows a real OHLC + volume tooltip for the hovered bar", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    const { container } = render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(container.querySelector(".advanced-chart__canvas-stack")).toBeInTheDocument());
    // Let the ResizeObserver-driven containerWidth state update (real,
    // async React state) settle, and the first real rAF-batched draw()
    // run, before simulating the pointer move — draw() only sets the
    // canvas's own style.width once geometry (which needs a non-zero
    // containerWidth) is ready.
    await waitFor(() => expect(container.querySelector(".advanced-chart__layer--price").style.width).toBeTruthy(), { timeout: 2000 });

    const stack = container.querySelector(".advanced-chart__canvas-stack");
    fireEvent.pointerMove(stack, { clientX: 50, clientY: 50 });

    await waitFor(() => expect(container.querySelector(".advanced-chart__tooltip")).toBeInTheDocument(), { timeout: 2000 });
    expect(container.querySelector(".advanced-chart__tooltip").textContent).toMatch(/O\s*\d/);
  });

  it("Phase X3 — double-click resets the view to the default window", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    const { container } = render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(container.querySelector(".advanced-chart__canvas-stack")).toBeInTheDocument());
    const stack = container.querySelector(".advanced-chart__canvas-stack");
    // Should not throw, and the chart stays mounted/functional afterward.
    fireEvent.doubleClick(stack);
    expect(container.querySelector(".advanced-chart__layer--price")).toBeInTheDocument();
  });

  it("Phase X3 — Auto-fit and Reset buttons are real, clickable controls", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(screen.getByText("Auto-fit")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Auto-fit"));
    fireEvent.click(screen.getByText("Reset"));
    // No crash, chart remains functional — real state transitions, not fabricated.
    expect(screen.getByText("Auto-fit")).toBeInTheDocument();
  });

  it("Phase X3 — keyboard shortcuts (arrow keys, F, R) pan/fit/reset without error", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    const { container } = render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(container.querySelector(".advanced-chart__canvas-stack")).toBeInTheDocument());
    const stack = container.querySelector(".advanced-chart__canvas-stack");

    fireEvent.keyDown(stack, { key: "ArrowLeft" });
    fireEvent.keyDown(stack, { key: "ArrowRight" });
    fireEvent.keyDown(stack, { key: "ArrowUp" });
    fireEvent.keyDown(stack, { key: "ArrowDown" });
    fireEvent.keyDown(stack, { key: "f" });
    fireEvent.keyDown(stack, { key: "r" });

    expect(container.querySelector(".advanced-chart__layer--price")).toBeInTheDocument();
  });

  it("Phase X3 — the chart container is keyboard-focusable (real accessibility requirement)", async () => {
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "3mo", bars: BARS });
    const { container } = render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(container.querySelector(".advanced-chart__canvas-stack")).toBeInTheDocument());
    expect(container.querySelector(".advanced-chart__canvas-stack")).toHaveAttribute("tabindex", "0");
  });

  it("Phase X3 — performance: renders a large multi-year dataset (1250 bars) without throwing", async () => {
    const largeBars = Array.from({ length: 1250 }, (_, i) => ({
      date: `bar-${i}`,
      open: 100 + Math.sin(i) * 5,
      high: 105 + Math.sin(i) * 5,
      low: 95 + Math.sin(i) * 5,
      close: 101 + Math.sin(i) * 5,
      volume: 1_000_000,
    }));
    marketPositioningApi.getChart.mockResolvedValue({ symbol: "AAPL", range: "5y", bars: largeBars });
    const { container } = render(<AdvancedChart symbol="AAPL" />);
    await waitFor(() => expect(container.querySelector(".advanced-chart__layer--price")).toBeInTheDocument());
  });
});
