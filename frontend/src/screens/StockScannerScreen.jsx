import { useState } from "react";
import { Button } from "../components/ui";
import SectionCard from "../components/SectionCard";
import { agentOrchestratorApi } from "../services/api";

const DEFAULT_SYMBOLS = "NVDA, MSFT, AAPL";

function price(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "--";
}

function reportRow(symbol, report) {
  const result = (id) => report.agents?.find((agent) => agent.agentId === id)?.result?.raw || null;
  const fibonacci = result("fibonacci");
  const valuation = result("valuation");
  const earnings = result("earnings");
  return { symbol, confidence: report.overallConfidence, fibonacci, valuation, earnings };
}

export default function StockScannerScreen() {
  const [draft, setDraft] = useState(DEFAULT_SYMBOLS);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function scan() {
    const symbols = [...new Set(draft.split(/[\s,]+/).map((value) => value.trim().toUpperCase()).filter((value) => /^[A-Z.\-]{1,12}$/.test(value)))].slice(0, 8);
    if (!symbols.length) return;
    setRunning(true);
    setError("");
    setRows([]);
    const nextRows = [];
    for (const symbol of symbols) {
      try {
        const report = await agentOrchestratorApi.getStockIntelligence(symbol);
        nextRows.push(reportRow(symbol, report));
        setRows([...nextRows]);
      } catch {
        setError("One or more symbols could not be scanned. The completed rows below still use live agent data.");
      }
    }
    setRunning(false);
  }

  return (
    <div className="screen-page stock-scanner-screen">
      <section className="screen-hero screen-hero--orbital">
        <div><p className="eyebrow">Stock scanner</p><h1>Live Fibonacci opportunity map</h1><p className="subtext">Runs the connected domain agents for each symbol, then shows the verified swing levels and valuation context side by side.</p></div>
      </section>
      <SectionCard title="Scan symbols" subtitle="Up to 8 US tickers · each row is generated from live agent outputs" icon="⌁" className="screen-card">
        <div className="analysis-search"><input value={draft} onChange={(event) => setDraft(event.target.value.toUpperCase())} aria-label="Symbols to scan" /><Button type="button" onClick={scan} disabled={running}>{running ? "Scanning…" : "Run live scan"}</Button></div>
        {error ? <p className="company-description subtle">{error}</p> : null}
      </SectionCard>
      <section className="scanner-results" aria-live="polite">
        {rows.map((row) => (
          <article className="scanner-result" key={row.symbol}>
            <header><div><span>Live agent confidence</span><h2>{row.symbol}</h2></div><strong>{Number(row.confidence || 0)}/100</strong></header>
            <div className="scanner-result__summary"><span>{row.valuation?.valuationStatus?.replaceAll("_", " ") || "Valuation unavailable"}</span><span>{row.earnings?.forwardOutlook || "Earnings outlook unavailable"}</span></div>
            {row.fibonacci?.dataAvailable ? <div className="scanner-result__levels">{(row.fibonacci.monthlyScanLevels || []).map((level, index) => <div key={level.ratio}><b>{["Alert", "Alert", "Research", "Entry", "Entry"][index]} · {Number(level.ratio) * 100}%</b><i /><strong>{price(level.price)}</strong></div>)}</div> : <p className="company-description subtle">{row.fibonacci?.unavailableReason || "Fibonacci data is unavailable for this symbol."}</p>}
            <footer>Five levels use real monthly candles from the swing low to high. “Entry” is a research zone, never an automated buy order.</footer>
          </article>
        ))}
      </section>
    </div>
  );
}
