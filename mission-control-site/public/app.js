const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
let dashboardData = null;
let activeChartSymbol = "SPY";
let activeChartRange = "3mo";

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function updateClock() { $("#time").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

function quoteCard({ label, symbol, quote }) {
  const price = Number(quote?.price), change = Number(quote?.change), live = Number.isFinite(price);
  return `<button class="market ${live ? (change >= 0 ? "up" : "down") : "off"}" data-chart-symbol="${safe(symbol)}"><span>${safe(label)}</span><b>${live ? money.format(price) : "—"}</b><small>${live && Number.isFinite(change) ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "Feed unavailable"}</small><em>${safe(symbol)}</em></button>`;
}

function intelligenceItems(data) {
  const feed = Array.isArray(data.feed) ? data.feed : [];
  if (feed.length) return feed.map((item, index) => ({ id: item.id || index, title: item.headline || "Market signal", symbols: item.affectedAssets || item.relatedTickers || [], assets: (item.affectedAssets || item.relatedTickers || []).slice(0, 3).join(" · ") || item.eventType || "Market", score: Number(item.attentionScore ?? item.importanceScore ?? 0), detail: item.whyItMatters || item.marketImpactPrediction || "Verified live intelligence signal." }));
  return (data.brief || []).map((item, index) => ({ id: item.claimId || index, title: item.headline, symbols: item.affectedAssets || [], assets: (item.affectedAssets || []).join(" · "), score: Number(item.attentionScore || 0), detail: item.whyItMatters }));
}

function bindSymbols() { document.querySelectorAll("[data-symbol]").forEach((element) => element.addEventListener("click", () => openSymbol(element.dataset.symbol))); }

function bindChartSymbols() { document.querySelectorAll("[data-chart-symbol]").forEach((element) => element.addEventListener("click", () => { activeChartSymbol = element.dataset.chartSymbol; loadMainChart(); $("#live-chart").scrollIntoView({ behavior: "smooth", block: "center" }); })); }

function recommendationCards(items) {
  return (items || []).map((item) => {
    const confidence = Math.round(Number(item.qualityScore ?? item.confidenceScore ?? 0));
    return `<button data-symbol="${safe(item.symbol)}" class="recommendation-card action-${safe(String(item.action || "monitor").toLowerCase())}"><div><span>${safe(item.action || "MONITOR")}</span><b>${safe(item.symbol)}</b></div><p>${safe(item.reasoning || "Agent committee analysis is available.")}</p><strong><i style="--quality:${Math.max(0, Math.min(100, confidence))}%"></i>${confidence}/100 quality</strong></button>`;
  }).join("") || '<p class="empty">No active decision clears the committee threshold right now.</p>';
}

function renderDashboard(data) {
  dashboardData = data;
  $("#markets").innerHTML = data.quotes.map(quoteCard).join("");
  const score = Number(data.sentiment?.score);
  $("#sentiment-score").textContent = Number.isFinite(score) ? Math.round(score) : "—";
  $(".ring").style.setProperty("--score", `${Number.isFinite(score) ? score : 0}%`);
  $("#sentiment-label").textContent = !Number.isFinite(score) ? "Awaiting live data" : score >= 60 ? "Bullish market tone" : score <= 40 ? "Defensive market tone" : "Balanced market tone";
  $("#sentiment-confidence").textContent = Number.isFinite(Number(data.sentiment?.confidence)) ? `${Math.round(data.sentiment.confidence)}/100` : "—";

  const agents = data.intelligence || {}, liveAgents = Number(agents.fulfilled || 0), totalAgents = Number(agents.total || 0), unavailable = Number(agents.unavailable || 0) + Number(agents.failed || 0);
  $("#agent-live").textContent = totalAgents ? `${liveAgents}/${totalAgents}` : "—";
  $("#network-title").textContent = totalAgents ? `${liveAgents} live agent feeds` : "Agent network unavailable";
  $("#network-copy").textContent = totalAgents ? `${unavailable} sources unavailable; only verified outputs shown.` : "No source status returned.";

  const items = intelligenceItems(data);
  $("#priority-count").textContent = `${items.length} verified signal${items.length === 1 ? "" : "s"}`;
  $("#events").innerHTML = items.length ? items.slice(0, 3).map((item, index) => `<li><i class="event-${index}"></i><div><b>${safe(item.title)}</b><small>${safe(item.assets)}</small></div><strong>${item.score}</strong></li>`).join("") : '<li class="empty">No verified market event is available yet.</li>';
  $("#signals").innerHTML = items.length ? items.slice(0, 4).map((item) => `<button class="signal-item" ${item.symbols[0] ? `data-symbol="${safe(item.symbols[0])}"` : ""} title="${safe(item.detail)}"><i></i><span><b>${safe(item.title)}</b><small>${safe(item.assets)}</small></span><strong>${item.score}</strong></button>`).join("") : '<p class="empty">No high-priority verified signal is available yet.</p>';

  const portfolio = data.portfolio || {}, positions = portfolio.positions || [];
  $("#portfolio-total").textContent = Number.isFinite(Number(portfolio.totalValue)) ? money.format(portfolio.totalValue) : "—";
  $("#portfolio-action-copy").textContent = `${positions.length} positions · ${Number.isFinite(Number(portfolio.totalReturnPct)) ? `${Number(portfolio.totalReturnPct).toFixed(2)}% return` : "live"}`;
  $("#portfolio-kpis").innerHTML = `<div><span>Total return</span><b class="${Number(portfolio.totalReturnPct) >= 0 ? "gain" : "loss"}">${Number.isFinite(Number(portfolio.totalReturnPct)) ? `${portfolio.totalReturnPct > 0 ? "+" : ""}${Number(portfolio.totalReturnPct).toFixed(2)}%` : "—"}</b></div><div><span>Cash</span><b>${Number.isFinite(Number(portfolio.cashBalance)) ? money.format(portfolio.cashBalance) : "—"}</b></div><div><span>Daily P/L</span><b class="${Number(portfolio.dailyPnl) >= 0 ? "gain" : "loss"}">${Number.isFinite(Number(portfolio.dailyPnl)) ? money.format(portfolio.dailyPnl) : "—"}</b></div>`;
  $("#positions").innerHTML = positions.slice(0, 6).map((position) => `<button data-symbol="${safe(position.symbol)}"><span><b>${safe(position.symbol)}</b><small>${safe(position.sector)} · ${position.quantity} shares</small></span><span><b>${money.format(position.marketValue)}</b><small class="${position.unrealizedPnlPct >= 0 ? "gain" : "loss"}">${position.unrealizedPnlPct > 0 ? "+" : ""}${Number(position.unrealizedPnlPct).toFixed(2)}%</small></span></button>`).join("") || '<p class="empty">No open positions.</p>';
  $("#watchlist-items").innerHTML = (data.watchlist || []).map((item) => `<button data-symbol="${safe(item.symbol)}"><span><b>${safe(item.symbol)}</b><small>${safe(item.company || "Tracked symbol")}</small></span><span><b>${Number.isFinite(Number(item.price)) ? money.format(item.price) : "Live"}</b><small class="${Number(item.change) >= 0 ? "gain" : "loss"}">${Number.isFinite(Number(item.change)) ? `${item.change > 0 ? "+" : ""}${Number(item.change).toFixed(2)}%` : "Open analysis"}</small></span></button>`).join("") || '<div class="watchlist-empty"><b>No saved watchlist yet</b><span>Your open positions remain one click away in the portfolio panel.</span></div>';
  $("#recommendation-items").innerHTML = recommendationCards(data.recommendations);
  const quoteCount = data.quotes.filter((item) => item.quote).length;
  $("#source-status").textContent = `Live sources: ${quoteCount}/${data.quotes.length} markets · ${liveAgents}/${totalAgents || 0} agents · ${positions.length} positions`;
  $("#updated").textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  bindSymbols();
  bindChartSymbols();
}

function candlestickSvg(bars) {
  if (!bars.length) return '<div class="chart-empty">No verified chart history is available for this range.</div>';
  const width = 1120, height = 390, left = 58, right = 72, top = 22, volumeHeight = 72, bottom = 28;
  const priceBottom = height - volumeHeight - bottom - 12;
  const lows = bars.map((bar) => Number(bar.low)), highs = bars.map((bar) => Number(bar.high));
  const min = Math.min(...lows), max = Math.max(...highs), spread = max - min || 1, maxVolume = Math.max(...bars.map((bar) => Number(bar.volume || 0)), 1);
  const plotWidth = width - left - right, step = plotWidth / bars.length, candleWidth = Math.max(2, Math.min(10, step * .56));
  const y = (value) => top + ((max - Number(value)) / spread) * (priceBottom - top);
  const levels = Array.from({ length: 5 }, (_, index) => max - (spread * index / 4));
  const grid = levels.map((value) => `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text x="${width - right + 10}" y="${y(value) + 4}">${value.toFixed(2)}</text>`).join("");
  const candles = bars.map((bar, index) => { const x = left + step * index + step / 2, up = Number(bar.close) >= Number(bar.open), color = up ? "#5ce1ae" : "#f06f83", bodyTop = Math.min(y(bar.open), y(bar.close)), bodyHeight = Math.max(2, Math.abs(y(bar.open) - y(bar.close))), volumeY = height - bottom - (Number(bar.volume || 0) / maxVolume) * volumeHeight; return `<g><line class="wick" x1="${x}" y1="${y(bar.high)}" x2="${x}" y2="${y(bar.low)}" stroke="${color}"/><rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="1" fill="${color}"/><rect class="volume-bar" x="${x - candleWidth / 2}" y="${volumeY}" width="${candleWidth}" height="${height - bottom - volumeY}" fill="${color}"/></g>`; }).join("");
  const firstDate = new Date(bars[0].date).toLocaleDateString([], { month: "short", day: "numeric" }), lastDate = new Date(bars.at(-1).date).toLocaleDateString([], { month: "short", day: "numeric" });
  return `<svg class="candlestick-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(activeChartSymbol)} candlestick price chart"><g class="chart-grid">${grid}</g>${candles}<text class="axis-date" x="${left}" y="${height - 5}">${safe(firstDate)}</text><text class="axis-date" text-anchor="end" x="${width - right}" y="${height - 5}">${safe(lastDate)}</text><text class="watermark" x="${width / 2}" y="${priceBottom / 2}">${safe(activeChartSymbol)}</text></svg>`;
}

async function loadMainChart() {
  $("#chart-symbol").textContent = activeChartSymbol;
  $("#main-chart").innerHTML = `<div class="symbol-loading"><span></span>Loading live ${safe(activeChartSymbol)} chart…</div>`;
  document.querySelectorAll("#chart-ranges button").forEach((button) => button.classList.toggle("active", button.dataset.range === activeChartRange));
  try {
    const response = await fetch(`/api/symbol/${encodeURIComponent(activeChartSymbol)}?range=${encodeURIComponent(activeChartRange)}`), data = await response.json();
    if (!response.ok) throw new Error(data.error || "Chart unavailable");
    const quote = data.quote?.quote || {}, bars = data.chart || [], first = Number(bars[0]?.close), last = Number(bars.at(-1)?.close), rangeChange = Number.isFinite(first) && Number.isFinite(last) && first !== 0 ? ((last - first) / first) * 100 : Number(quote.changePercent ?? quote.change);
    $("#chart-price").textContent = Number.isFinite(Number(quote.price)) ? money.format(quote.price) : Number.isFinite(last) ? money.format(last) : "—";
    $("#chart-change").className = rangeChange >= 0 ? "gain" : "loss";
    $("#chart-change").textContent = Number.isFinite(rangeChange) ? `${rangeChange > 0 ? "+" : ""}${rangeChange.toFixed(2)}% for range` : "—";
    $("#chart-updated").textContent = `${bars.length} verified bars · updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    $("#main-chart").innerHTML = candlestickSvg(bars);
  } catch (error) { $("#main-chart").innerHTML = `<div class="symbol-error"><b>Chart unavailable</b><p>${safe(error.message)}</p></div>`; }
}

function chartSvg(bars) {
  if (!bars.length) return '<div class="chart-empty">No chart history available.</div>';
  const width = 760, height = 230, pad = 18, closes = bars.map((bar) => Number(bar.close)), low = Math.min(...closes), high = Math.max(...closes), spread = high - low || 1;
  const points = closes.map((value, index) => `${pad + (index / Math.max(1, closes.length - 1)) * (width - pad * 2)},${height - pad - ((value - low) / spread) * (height - pad * 2)}`).join(" ");
  const linePath = points.split(" ").map((point, index) => `${index ? "L" : "M"}${point}`).join(" ");
  return `<svg class="price-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price chart"><defs><linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f72ff" stop-opacity=".42"/><stop offset="1" stop-color="#6f72ff" stop-opacity="0"/></linearGradient></defs><path d="${linePath} L${width - pad},${height - pad} L${pad},${height - pad} Z" fill="url(#chart-area)"/><path d="${linePath}" fill="none" stroke="#8d8fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

async function openSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  if (!normalized || normalized === "MARKET") return;
  const dialog = $("#symbol-dialog");
  $("#symbol-content").innerHTML = `<div class="symbol-loading"><span></span>Loading live ${safe(normalized)} intelligence…</div>`;
  dialog.showModal();
  try {
    const response = await fetch(`/api/symbol/${encodeURIComponent(normalized)}?range=1mo`), data = await response.json();
    if (!response.ok) throw new Error(data.error || "Symbol data unavailable");
    const quote = data.quote?.quote || {}, recommendation = data.recommendations?.[0], change = Number(quote.changePercent ?? quote.change);
    $("#symbol-content").innerHTML = `<header class="symbol-header"><div><p class="card-title">LIVE SYMBOL INTELLIGENCE</p><h2>${safe(data.symbol)} <small>${safe(data.quote?.company?.name || "")}</small></h2></div><div><b>${Number.isFinite(Number(quote.price)) ? money.format(quote.price) : "—"}</b><span class="${change >= 0 ? "gain" : "loss"}">${Number.isFinite(change) ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}</span></div></header>${chartSvg(data.chart || [])}<div class="symbol-kpis"><div><span>Market cap</span><b>${safe(quote.marketCap || "—")}</b></div><div><span>P/E</span><b>${safe(quote.pe || "—")}</b></div><div><span>Volume</span><b>${safe(quote.volume || "—")}</b></div><div><span>Agent status</span><b>${safe(data.intelligence?.summary?.fulfilled ? `${data.intelligence.summary.fulfilled}/${data.intelligence.summary.total} live` : "Partial")}</b></div></div><div class="symbol-verdict"><span>${safe(recommendation?.action || data.quote?.recommendation?.label || "MONITOR")}</span><p>${safe(recommendation?.reasoning || data.quote?.recommendation?.reason || "No active recommendation is available for this symbol.")}</p></div>`;
  } catch (error) { $("#symbol-content").innerHTML = `<div class="symbol-error"><b>Live data unavailable</b><p>${safe(error.message)}</p></div>`; }
}

function openAssistant() { $("#assistant-dialog").showModal(); setTimeout(() => $("#assistant-question").focus(), 50); }

async function askAssistant(event) {
  event.preventDefault();
  const question = $("#assistant-question").value.trim(); if (!question) return;
  $("#assistant-answer").innerHTML = '<span class="assistant-thinking"></span>Reading your live workspace…';
  try {
    const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, context: { portfolio: dashboardData?.portfolio, topSignals: intelligenceItems(dashboardData || {}).slice(0, 4), marketSentiment: dashboardData?.sentiment, recommendations: dashboardData?.recommendations } }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || "Assistant unavailable");
    $("#assistant-answer").innerHTML = `<b>${safe(question)}</b><p>${safe(result.answer)}</p><small>${result.source === "openai" ? "Generated from your live ImpactOne context" : safe(result.providerNotice || "Local fallback response")}</small>`;
  } catch (error) { $("#assistant-answer").innerHTML = `<b>Assistant unavailable</b><p>${safe(error.message)}</p>`; }
}

async function loadDashboard() {
  $("#refresh-button").classList.add("spinning");
  try { const response = await fetch("/api/dashboard"); if (!response.ok) throw new Error("Dashboard unavailable"); renderDashboard(await response.json()); }
  catch { $("#source-status").textContent = "ImpactOne backend is unavailable. Start it and refresh."; }
  finally { $("#refresh-button").classList.remove("spinning"); }
}

$("#symbol-search").addEventListener("submit", (event) => { event.preventDefault(); openSymbol($("#search").value); });
$("#assistant-button").addEventListener("click", openAssistant); $("#analysis-button").addEventListener("click", openAssistant);
$("#scanner-button").addEventListener("click", () => { $("#search").focus(); $("#search").placeholder = "Enter a symbol for live multi-agent analysis…"; window.scrollTo({ top: 0, behavior: "smooth" }); });
$("#refresh-button").addEventListener("click", loadDashboard);
$("#dialog-close").addEventListener("click", () => $("#symbol-dialog").close());
$("#symbol-dialog").addEventListener("click", (event) => { if (event.target === $("#symbol-dialog")) $("#symbol-dialog").close(); });
$("#assistant-close").addEventListener("click", () => $("#assistant-dialog").close());
$("#assistant-dialog").addEventListener("click", (event) => { if (event.target === $("#assistant-dialog")) $("#assistant-dialog").close(); });
$("#assistant-form").addEventListener("submit", askAssistant);
document.querySelectorAll(".sidebar nav a").forEach((link) => link.addEventListener("click", () => { document.querySelectorAll(".sidebar nav a").forEach((item) => item.classList.remove("active")); link.classList.add("active"); }));
updateClock(); setInterval(updateClock, 1000); loadDashboard(); setInterval(loadDashboard, 60000);
document.querySelectorAll("#chart-ranges button").forEach((button) => button.addEventListener("click", () => { activeChartRange = button.dataset.range; loadMainChart(); }));
loadMainChart();
