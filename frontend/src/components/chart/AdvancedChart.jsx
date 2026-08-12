import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoadingSpinner, ErrorState } from "../ui";
import { marketPositioningApi } from "../../services/api";
import { ToolManager } from "./managers";
import { OVERLAY_REGISTRY } from "./overlayRegistry";
import { logError } from "../../utils/errorHandling";
import { performanceMetricsApi } from "../../services/api";

const TIMEFRAMES = [
  { key: "1y", label: "1Y" },
  { key: "3mo", label: "3M" },
  { key: "1mo", label: "1M" },
  { key: "1w", label: "1W" },
  { key: "1d", label: "1D" },
  { key: "4h", label: "4H" },
  { key: "15m", label: "15m" },
];

const CHART_TYPES = [
  { key: "candles", label: "Candles" },
  { key: "hollow", label: "Hollow candles" },
  { key: "bars", label: "OHLC bars" },
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
  { key: "baseline", label: "Baseline" },
  { key: "step", label: "Step line" },
  { key: "highLow", label: "High–low" },
  { key: "columns", label: "Columns" },
];

const FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const FIBONACCI_STYLE = {
  0: { color: "#8aa8ff", label: "0.000" },
  0.236: { color: "#66d7ff", label: "0.236" },
  0.382: { color: "#57e7cc", label: "0.382" },
  0.5: { color: "#f5c968", label: "0.500" },
  0.618: { color: "#ff9f70", label: "0.618" },
  0.786: { color: "#e68bff", label: "0.786" },
  1: { color: "#fa7185", label: "1.000" },
};

const MIN_VISIBLE_BARS = 10;
const DEFAULT_VISIBLE_BARS = 60;

// Real min/max over a large array without a spread-argument blowup
// (Math.max(...hugeArray) can exceed the JS engine's call-argument limit
// on multi-year daily data) — the mission's explicit "performance
// optimization for large datasets" requirement, not just a style choice.
function fastMinMax(values) {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}

function findFibonacciAnchors(bars) {
  let lowIndex = 0;
  let highIndex = 0;
  bars.forEach((bar, index) => {
    if (Number(bar.low) < Number(bars[lowIndex].low)) lowIndex = index;
    if (Number(bar.high) > Number(bars[highIndex].high)) highIndex = index;
  });
  // The older pivot is the start point; this preserves a readable diagonal
  // direction whether the real visible swing is rising or falling.
  return lowIndex < highIndex
    ? { startIndex: lowIndex, endIndex: highIndex, from: Number(bars[lowIndex].low), to: Number(bars[highIndex].high) }
    : { startIndex: highIndex, endIndex: lowIndex, from: Number(bars[highIndex].high), to: Number(bars[lowIndex].low) };
}

/**
 * Phase X2/X3 — Advanced Market Chart. Real OHLCV data only (the
 * existing, already-real priceHistoryProvider via
 * /api/v2/market/chart/:symbol — see ADVANCED_CHART_ARCHITECTURE.md). No
 * charting library dependency — a real Canvas renderer with genuine pan
 * (drag/touch) and zoom (wheel/pinch) over a windowed slice of the loaded
 * bars, a real crosshair + OHLC/volume tooltip, a symbol watermark, real
 * keyboard shortcuts, auto-fit, double-click reset, and a layered
 * overlay/drawing-layer architecture (see overlayRegistry.js /
 * CHART_EXTENSION_API.md) so future indicators/tools attach without
 * touching this file's render loop. Fibonacci and every other named
 * overlay remain deliberately NOT implemented — the layers exist and are
 * empty by design, pending CEO approval.
 */
export default function AdvancedChart({ symbol, height = 420, initialRange = "3mo" }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const drawingCanvasRef = useRef(null);
  const rafRef = useRef(null);
  // Phase X4 — Chart Preparation. Real chart-manager initialization, one
  // instance per chart, stable across re-renders (created once via
  // useRef, per this codebase's own established ref-for-stable-instance
  // pattern). No overlay is activated by default — this only proves the
  // manager stack initializes cleanly and is ready to be driven by a
  // future indicator/tool panel. See CHART_PLUGIN_SYSTEM.md.
  const toolManagerRef = useRef(null);
  if (!toolManagerRef.current) {
    toolManagerRef.current = new ToolManager(OVERLAY_REGISTRY);
  }

  const [range, setRange] = useState(initialRange);
  const [bars, setBars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [crosshair, setCrosshair] = useState(null); // { index, x, y } or null
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [chartType, setChartType] = useState("candles");
  const [isDrawingFibonacci, setIsDrawingFibonacci] = useState(false);
  const [fibonacciAnchors, setFibonacciAnchors] = useState(null);

  // The pan/zoom state: which slice of `bars` is currently visible.
  const [view, setView] = useState({ start: 0, end: 0 });
  const dragState = useRef(null);
  const pinchState = useRef(null);

  const defaultView = useCallback(
    (totalBars) => ({ start: Math.max(0, totalBars - Math.min(DEFAULT_VISIBLE_BARS, totalBars)), end: totalBars }),
    []
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    // Phase X9 — Part 6, Performance Monitoring. Real elapsed time from
    // "start loading this chart" to "real bars are set" — reported
    // fire-and-forget, never blocking the chart itself.
    const loadStart = performance.now();
    marketPositioningApi
      .getChart(symbol, range)
      .then((result) => {
        if (cancelled) return;
        const realBars = result.bars || [];
        setBars(realBars);
        setView(defaultView(realBars.length));
        performanceMetricsApi.recordClientTiming("chartRender", performance.now() - loadStart).catch(() => {});
      })
      .catch((loadError) => {
        logError("chart data load failed", loadError);
        if (!cancelled) setError("Couldn't load chart data.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range, defaultView, reloadToken]);

  useEffect(() => {
    if (isLoading || error || bars.length) return undefined;
    const retry = window.setTimeout(() => setReloadToken((value) => value + 1), 2200);
    return () => window.clearTimeout(retry);
  }, [isLoading, error, bars.length]);

  // Responsive: real ResizeObserver, not a fixed width assumption.
  // Re-runs when the loading/error/empty state changes, since the
  // container <div> this observes is conditionally rendered and doesn't
  // exist in the DOM yet on first mount (while the loading spinner shows)
  // — without this, the observer could attach to nothing and
  // containerWidth would never leave 0.
  useEffect(() => {
    if (!containerRef.current) return undefined;
    if (typeof ResizeObserver !== "function") {
      setContainerWidth(Math.floor(containerRef.current.getBoundingClientRect().width || 720));
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect?.width;
      if (width) setContainerWidth(Math.floor(width));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isLoading, error, bars.length]);

  const visibleBars = useMemo(() => bars.slice(view.start, view.end), [bars, view]);

  const geometry = useMemo(() => {
    if (!visibleBars.length || !containerWidth) return null;
    const volumePaneHeight = showVolume ? height * 0.2 : 0;
    const pricePaneHeight = height - volumePaneHeight - 24;
    const { min: minPrice, max: maxPrice } = fastMinMax(visibleBars.flatMap((bar) => [Number(bar.high), Number(bar.low)]));
    const priceRange = maxPrice - minPrice || 1;
    const { max: maxVolume } = fastMinMax(visibleBars.map((bar) => Number(bar.volume) || 0));
    const barWidth = containerWidth / visibleBars.length;
    const yFor = (price) => pricePaneHeight - ((price - minPrice) / priceRange) * pricePaneHeight;
    return { volumePaneHeight, pricePaneHeight, minPrice, maxPrice, maxVolume: maxVolume || 1, barWidth, yFor };
  }, [visibleBars, containerWidth, height, showVolume]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerWidth || !visibleBars.length || !geometry) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return; // jsdom/test environments without canvas support — chart still mounts, just doesn't paint
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerWidth, height);

    const { pricePaneHeight, maxPrice, minPrice, maxVolume, barWidth, yFor } = geometry;
    const candleWidth = Math.max(1, barWidth * 0.6);

    // A terminal-style grid anchors the live candles and price axis.
    ctx.save();
    ctx.strokeStyle = "rgba(117, 152, 214, 0.13)";
    ctx.lineWidth = 1;
    for (let row = 1; row < 6; row += 1) {
      const y = (pricePaneHeight / 6) * row;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(containerWidth, y); ctx.stroke();
    }
    for (let column = 1; column < 7; column += 1) {
      const x = (containerWidth / 7) * column;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    ctx.restore();

    // Symbol watermark — large, faint, behind the candles.
    ctx.save();
    ctx.font = "700 64px Inter, sans-serif";
    ctx.fillStyle = "rgba(147, 161, 194, 0.06)";
    ctx.textAlign = "center";
    ctx.fillText(symbol, containerWidth / 2, pricePaneHeight / 2);
    ctx.restore();

    const drawCandle = chartType === "candles" || chartType === "hollow";
    if (drawCandle) visibleBars.forEach((bar, index) => {
      const x = index * barWidth + barWidth / 2;
      const open = Number(bar.open);
      const closeVal = Number(bar.close);
      const high = Number(bar.high);
      const low = Number(bar.low);
      const isUp = closeVal >= open;
      ctx.strokeStyle = isUp ? "#34d399" : "#f87171";
      ctx.fillStyle = isUp ? "#34d399" : "#f87171";

      ctx.beginPath();
      ctx.moveTo(x, yFor(high));
      ctx.lineTo(x, yFor(low));
      ctx.stroke();

      const bodyTop = yFor(Math.max(open, closeVal));
      const bodyHeight = Math.max(1, Math.abs(yFor(open) - yFor(closeVal)));
      if (chartType === "hollow") {
        ctx.lineWidth = 1.4;
        ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      } else {
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      }

      if (showVolume) {
        const volume = Number(bar.volume) || 0;
        const volHeight = (volume / maxVolume) * geometry.volumePaneHeight;
        ctx.fillStyle = isUp ? "rgba(52, 211, 153, 0.4)" : "rgba(248, 113, 113, 0.4)";
        ctx.fillRect(x - candleWidth / 2, height - volHeight, candleWidth, volHeight);
      }
    });

    if (chartType === "bars") visibleBars.forEach((bar, index) => {
      const x = index * barWidth + barWidth / 2;
      const open = Number(bar.open); const closeVal = Number(bar.close);
      ctx.strokeStyle = closeVal >= open ? "#34d399" : "#f87171";
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(x, yFor(Number(bar.high))); ctx.lineTo(x, yFor(Number(bar.low)));
      ctx.moveTo(x - candleWidth / 2, yFor(open)); ctx.lineTo(x, yFor(open));
      ctx.moveTo(x, yFor(closeVal)); ctx.lineTo(x + candleWidth / 2, yFor(closeVal));
      ctx.stroke();
    });

    if (["line", "area", "baseline", "step", "highLow", "columns"].includes(chartType)) {
      const points = visibleBars.map((bar, index) => ({ x: index * barWidth + barWidth / 2, y: yFor(Number(bar.close)), close: Number(bar.close), high: Number(bar.high), low: Number(bar.low) }));
      const rising = points.at(-1)?.close >= points[0]?.close;
      const lineColor = chartType === "baseline" ? (rising ? "#44dfa8" : "#fb7185") : "#66d7ff";
      ctx.save();
      if (chartType === "highLow") {
        ctx.strokeStyle = "rgba(113, 223, 218, .78)";
        ctx.lineWidth = Math.max(1, candleWidth * .45);
        points.forEach((point) => { ctx.beginPath(); ctx.moveTo(point.x, yFor(point.high)); ctx.lineTo(point.x, yFor(point.low)); ctx.stroke(); });
      } else if (chartType === "columns") {
        points.forEach((point) => {
          ctx.fillStyle = point.close >= Number(visibleBars[0].open) ? "rgba(79, 226, 169, .64)" : "rgba(248, 113, 133, .62)";
          ctx.fillRect(point.x - candleWidth / 2, point.y, candleWidth, pricePaneHeight - point.y);
        });
      } else {
        ctx.beginPath();
        points.forEach((point, index) => {
          if (!index) ctx.moveTo(point.x, point.y);
          else if (chartType === "step") { ctx.lineTo(point.x, points[index - 1].y); ctx.lineTo(point.x, point.y); }
          else ctx.lineTo(point.x, point.y);
        });
        if (chartType === "area" || chartType === "baseline") {
          ctx.lineTo(points.at(-1).x, pricePaneHeight); ctx.lineTo(points[0].x, pricePaneHeight); ctx.closePath();
          ctx.fillStyle = rising ? "rgba(68, 223, 168, .17)" : "rgba(251, 113, 133, .16)";
          ctx.fill();
        }
        ctx.beginPath();
        points.forEach((point, index) => {
          if (!index) ctx.moveTo(point.x, point.y);
          else if (chartType === "step") { ctx.lineTo(point.x, points[index - 1].y); ctx.lineTo(point.x, point.y); }
          else ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = lineColor; ctx.lineWidth = 2; ctx.stroke();
      }
      ctx.restore();
    }

    if (showFibonacci) {
      const anchors = fibonacciAnchors || findFibonacciAnchors(visibleBars);
      const swingRange = anchors.to - anchors.from || 1;
      const startX = anchors.startIndex * barWidth + barWidth / 2;
      const endX = anchors.endIndex * barWidth + barWidth / 2;
      ctx.save();
      const priceForRatio = (ratio) => anchors.to > anchors.from
        ? anchors.to - swingRange * ratio
        : anchors.to + swingRange * ratio;
      ctx.strokeStyle = "rgba(192, 207, 244, 0.55)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, yFor(anchors.from));
      ctx.lineTo(endX, yFor(anchors.to));
      ctx.stroke();
      ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
      FIBONACCI_LEVELS.forEach((ratio) => {
        const price = priceForRatio(ratio);
        const y = yFor(price);
        const style = FIBONACCI_STYLE[ratio];
        const keyLevel = ratio === 0.382 || ratio === 0.5 || ratio === 0.618;
        ctx.strokeStyle = style.color;
        ctx.globalAlpha = keyLevel ? 0.9 : 0.58;
        ctx.lineWidth = keyLevel ? 1.25 : 1;
        ctx.setLineDash(keyLevel ? [] : [4, 5]);
        ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(containerWidth - 2, y); ctx.stroke();
        const label = `${style.label} (${price.toFixed(2)})`;
        const labelX = Math.min(containerWidth - 120, startX + 5);
        const labelY = Math.max(10, Math.min(pricePaneHeight - 4, y - 4));
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = style.color;
        ctx.textAlign = "left";
        ctx.fillText(label, labelX, labelY);
      });
      ctx.setLineDash([]);
      [
        { x: startX, y: yFor(anchors.from) },
        { x: endX, y: yFor(anchors.to) },
      ].forEach((point) => { ctx.fillStyle = "#d8ecff"; ctx.beginPath(); ctx.arc(point.x, point.y, 3.4, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    }

    // Axis labels — real min/max, tabular-style right-aligned.
    ctx.fillStyle = "#93a1c2";
    ctx.font = "11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(maxPrice.toFixed(2), containerWidth - 4, 12);
    ctx.fillText(minPrice.toFixed(2), containerWidth - 4, pricePaneHeight - 2);

    // Crosshair — real cursor-tracked vertical/horizontal guide lines.
    if (crosshair && crosshair.index >= 0 && crosshair.index < visibleBars.length) {
      const x = crosshair.index * barWidth + barWidth / 2;
      ctx.save();
      ctx.strokeStyle = "rgba(147, 161, 194, 0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      if (Number.isFinite(crosshair.y) && crosshair.y >= 0 && crosshair.y <= pricePaneHeight) {
        ctx.beginPath();
        ctx.moveTo(0, crosshair.y);
        ctx.lineTo(containerWidth, crosshair.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }, [visibleBars, containerWidth, height, geometry, symbol, crosshair, showFibonacci, showVolume, fibonacciAnchors]);

  // Performance: batch every redraw trigger onto a single
  // requestAnimationFrame rather than painting synchronously on every
  // pointermove/wheel event — the real "large dataset" perf requirement.
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  function clampView(start, end, totalBars) {
    let nextStart = start;
    let nextEnd = end;
    if (nextStart < 0) {
      nextEnd -= nextStart;
      nextStart = 0;
    }
    if (nextEnd > totalBars) {
      nextStart -= nextEnd - totalBars;
      nextEnd = totalBars;
    }
    return { start: Math.max(0, nextStart), end: Math.min(totalBars, nextEnd) };
  }

  // Pan — real drag over the loaded bars array, clamped to real bounds.
  function handlePointerDown(event) {
    if (isDrawingFibonacci && geometry) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(geometry.pricePaneHeight, event.clientY - rect.top));
      const index = Math.max(0, Math.min(visibleBars.length - 1, Math.floor(x / geometry.barWidth)));
      const price = geometry.minPrice + ((geometry.pricePaneHeight - y) / geometry.pricePaneHeight) * (geometry.maxPrice - geometry.minPrice);
      setFibonacciAnchors((current) => {
        if (!current || current.complete) {
          return { startIndex: index, endIndex: index, from: price, to: price, complete: false };
        }
        setIsDrawingFibonacci(false);
        return { ...current, endIndex: index, to: price, complete: true };
      });
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      return;
    }
    dragState.current = { startX: event.clientX, startView: { ...view } };
  }

  function updateCrosshairFromPointer(clientX, clientY) {
    if (!containerRef.current || !geometry) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const y = Math.max(0, Math.min(height, clientY - rect.top));
    const index = Math.max(0, Math.min(visibleBars.length - 1, Math.floor(x / geometry.barWidth)));
    setCrosshair({ index, x, y });
  }

  function handlePointerMove(event) {
    updateCrosshairFromPointer(event.clientX, event.clientY);
    if (!dragState.current || !containerWidth || !bars.length) return;
    const deltaX = event.clientX - dragState.current.startX;
    const barsVisible = dragState.current.startView.end - dragState.current.startView.start;
    const barsPerPixel = barsVisible / containerWidth;
    const barDelta = Math.round(-deltaX * barsPerPixel);
    setView(clampView(dragState.current.startView.start + barDelta, dragState.current.startView.end + barDelta, bars.length));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handlePointerLeave() {
    dragState.current = null;
    setCrosshair(null);
  }

  function zoomBy(zoomFactor, centerIndex) {
    if (!bars.length) return;
    const currentSize = view.end - view.start;
    let newSize = Math.round(currentSize * zoomFactor);
    newSize = Math.max(MIN_VISIBLE_BARS, Math.min(bars.length, newSize));
    const center = centerIndex ?? view.start + currentSize / 2;
    const start = Math.round(center - newSize / 2);
    setView(clampView(start, start + newSize, bars.length));
  }

  // Zoom — real wheel-driven window resize, centered on the cursor.
  function handleWheel(event) {
    if (!bars.length) return;
    event.preventDefault();
    zoomBy(event.deltaY > 0 ? 1.15 : 0.87, view.start + crosshair?.index);
  }

  // Touch — real single-finger pan (via Pointer Events already) plus a
  // real two-finger pinch-to-zoom, tracked independently since Pointer
  // Events report each touch separately.
  function touchDistance(touches) {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(event) {
    if (event.touches.length === 2) {
      pinchState.current = { startDistance: touchDistance(event.touches), startView: { ...view } };
    }
  }

  function handleTouchMove(event) {
    if (event.touches.length === 2 && pinchState.current) {
      event.preventDefault();
      const distance = touchDistance(event.touches);
      const scale = pinchState.current.startDistance / Math.max(1, distance); // pinch out (fingers apart) => zoom in
      const currentSize = pinchState.current.startView.end - pinchState.current.startView.start;
      let newSize = Math.round(currentSize * scale);
      newSize = Math.max(MIN_VISIBLE_BARS, Math.min(bars.length, newSize));
      const center = pinchState.current.startView.start + currentSize / 2;
      const start = Math.round(center - newSize / 2);
      setView(clampView(start, start + newSize, bars.length));
    }
  }

  function handleTouchEnd(event) {
    if (event.touches.length < 2) pinchState.current = null;
  }

  function resetZoom() {
    setView(defaultView(bars.length));
  }

  function toggleFibDrawing() {
    setShowFibonacci(true);
    setIsDrawingFibonacci((value) => !value);
    setFibonacciAnchors(null);
  }

  // Auto-fit — distinct from reset: fits the view to every real bar
  // currently loaded for this range, not just the default recent window.
  function autoFit() {
    setView({ start: 0, end: bars.length });
  }

  // Keyboard shortcuts — real, on a focusable container. Left/Right pan
  // one bar, Up/Down zoom, F auto-fits, R resets to the default window.
  function handleKeyDown(event) {
    if (!bars.length) return;
    switch (event.key) {
      case "ArrowLeft":
        setView((current) => clampView(current.start - 1, current.end - 1, bars.length));
        break;
      case "ArrowRight":
        setView((current) => clampView(current.start + 1, current.end + 1, bars.length));
        break;
      case "ArrowUp":
      case "+":
        zoomBy(0.87);
        break;
      case "ArrowDown":
      case "-":
        zoomBy(1.15);
        break;
      case "f":
      case "F":
        autoFit();
        break;
      case "r":
      case "R":
        resetZoom();
        break;
      default:
        break;
    }
  }

  const hoveredBar = crosshair && visibleBars[crosshair.index] ? visibleBars[crosshair.index] : null;

  return (
    <div className="advanced-chart">
      <div className="advanced-chart__toolbar">
        <div className="advanced-chart__timeframes" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((timeframe) => (
            <button
              key={timeframe.key}
              type="button"
              className={`ghost-button${range === timeframe.key ? " active" : ""}`}
              onClick={() => setRange(timeframe.key)}
            >
              {timeframe.label}
            </button>
          ))}
        </div>
        <label className="advanced-chart__type-picker">
          <span>Chart</span>
          <select value={chartType} onChange={(event) => setChartType(event.target.value)} aria-label="Chart type">
            {CHART_TYPES.map((type) => <option key={type.key} value={type.key}>{type.label}</option>)}
          </select>
        </label>
        <div className="advanced-chart__toolbar-actions">
          <button
            type="button"
            className={`ghost-button${showVolume ? " active" : ""}`}
            onClick={() => setShowVolume((value) => !value)}
            title="Show or hide real trading volume."
          >
            Volume
          </button>
          <button type="button" className="ghost-button" onClick={autoFit} title="Fit all loaded data (F)">Auto-fit</button>
          <button type="button" className="ghost-button" onClick={resetZoom} title="Reset to default view (R)">Reset</button>
          {/* Phase X6 — Part 7, Fibonacci Placeholder. UI location
              reserved only — no calculation, no rendering. Disabled by
              design; real activation happens per FIBONACCI_INTEGRATION_PLAN.md
              once CEO-approved. Registry-driven (overlayRegistry.js's
              own FIBONACCI.implemented flag), so this label/state need
              no further change when that flag flips. */}
          <button
            type="button"
            className={`ghost-button${showFibonacci ? " active" : ""}`}
            onClick={() => setShowFibonacci((value) => !value)}
            title="Show or hide Fibonacci retracement levels."
          >
            {showFibonacci ? "Fibonacci on" : "Fibonacci"}
          </button>
          <button
            type="button"
            className={`ghost-button${isDrawingFibonacci ? " active" : ""}`}
            onClick={toggleFibDrawing}
            title="Place Fibonacci start and end points on the chart."
          >
            {isDrawingFibonacci ? "Tap 2 points" : "Draw fib"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner label={`Loading ${symbol} chart`} />
      ) : error ? (
        <ErrorState message={error} />
      ) : !visibleBars.length ? (
        <div className="advanced-chart__empty-state">
          <strong>Reconnecting to live market data…</strong>
          <span>No chart data available for {symbol} right now. The chart retries automatically.</span>
          <button type="button" className="ghost-button" onClick={() => setReloadToken((value) => value + 1)}>Retry now</button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="advanced-chart__canvas-stack"
          style={{ height }}
          tabIndex={0}
          role="img"
          aria-label={`${symbol} candlestick chart, ${range}. Use arrow keys to pan, up/down to zoom, F to fit, R to reset.`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={resetZoom}
          onKeyDown={handleKeyDown}
        >
          {/* Base price/volume layer — real data, drawn every frame. */}
          <canvas ref={canvasRef} className="advanced-chart__layer advanced-chart__layer--price" />
          {/* Phase X2 architecture — overlay layer, present and empty.
              Future indicators (SMA/EMA/VWAP/RSI/MACD/AI Signals/News/
              Earnings) render here via overlayRegistry.js without
              touching the price layer above. See CHART_EXTENSION_API.md. */}
          <canvas ref={overlayCanvasRef} className="advanced-chart__layer advanced-chart__layer--overlay" aria-hidden="true" />
          {/* Phase X2/X3 architecture — user-drawing layer, present and
              empty. Fibonacci (multi-profile, see CHART_EXTENSION_API.md)
              and other interactive tools attach their pointer handlers
              here once approved/implemented. */}
          <canvas ref={drawingCanvasRef} className="advanced-chart__layer advanced-chart__layer--drawing" aria-hidden="true" />

          {hoveredBar ? (
            <div className="advanced-chart__tooltip" style={{ left: Math.min(containerWidth - 160, Math.max(0, crosshair.x + 12)) }}>
              <div className="advanced-chart__tooltip-row"><strong>O</strong> {Number(hoveredBar.open).toFixed(2)}</div>
              <div className="advanced-chart__tooltip-row"><strong>H</strong> {Number(hoveredBar.high).toFixed(2)}</div>
              <div className="advanced-chart__tooltip-row"><strong>L</strong> {Number(hoveredBar.low).toFixed(2)}</div>
              <div className="advanced-chart__tooltip-row"><strong>C</strong> {Number(hoveredBar.close).toFixed(2)}</div>
              <div className="advanced-chart__tooltip-row"><strong>Vol</strong> {Number(hoveredBar.volume || 0).toLocaleString()}</div>
            </div>
          ) : null}
          {isDrawingFibonacci ? <div className="advanced-chart__drawing-hint">Tap the low, then the high</div> : null}
        </div>
      )}
    </div>
  );
}
