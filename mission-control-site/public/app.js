const $ = (selector) => document.querySelector(selector);
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
let dashboardData = null;
let activeChartSymbol = "DXY";
let activeChartRange = "3mo";
let activeChartType = "candles";
const activeStudies = new Set(["volume"]);
let fibonacciVisible = false;
let currentChartBars = [];
let visibleChartBars = [];
let chartViewport = null;
let chartPan = null;
let currentFibonacci = null;
let currentTimeframeMeta = null;
let chartRequestId = 0;
let chartLoading = false;
let measureActive = false;
let measurement = null;
let currentChartPrice = null;
let paperDirection = "LONG";
let paperTradePlan = null;
let latestSymbolPayload = null;
const MARKET_PREFS_KEY = "impactone:mission-control:market-ribbon:v1";
const DEFAULT_MARKET_ORDER = ["DXY", "BTC", "USDT.D", "GOLD", "NQ", "ES", "US10Y", "VIX"];
let selectedMarketSymbols = readMarketPreferences();
let draftMarketSymbols = [...selectedMarketSymbols];

function safe(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function symbolLogo(symbol, size = "medium") {
  const normalized = String(symbol || "").trim().toUpperCase();
  return `<span class="company-symbol-logo company-symbol-logo--${safe(size)}" aria-hidden="true"><img src="/api/company-logo/${encodeURIComponent(normalized)}" alt="" loading="lazy" onerror="this.hidden=true" /><b>${safe(normalized.slice(0, 2) || "?")}</b></span>`;
}

function impactOneLoadingScene(symbol, context = "intelligence") {
  const safeSymbol = safe(symbol);
  const detail = context === "chart" ? "Aligning verified candles" : "Cross-checking the agent network";
  return `<div class="impact-loading-scene" role="status" aria-live="polite" aria-label="Loading live ${safeSymbol} ${safe(context)}">
    <div class="impact-loading-scene__space" aria-hidden="true">
      <span class="impact-loading-scene__horizon"></span>
      <span class="impact-loading-scene__earth"><i></i></span>
      <span class="impact-loading-scene__scan"></span>
      <span class="impact-loading-scene__signal impact-loading-scene__signal--price">PRICE</span>
      <span class="impact-loading-scene__signal impact-loading-scene__signal--news">NEWS</span>
      <span class="impact-loading-scene__signal impact-loading-scene__signal--fib">0.886</span>
    </div>
    <p>IMPACTONE SIGNAL ENGINE</p>
    <strong>${safeSymbol}</strong>
    <span class="impact-loading-scene__status">${detail}<i></i><i></i><i></i></span>
    <span class="impact-loading-scene__progress" aria-hidden="true"><i></i></span>
    <small>Noise stays outside. Verified signals come in.</small>
  </div>`;
}

function readMarketPreferences() { try { const value = JSON.parse(localStorage.getItem(MARKET_PREFS_KEY)); return Array.isArray(value) && value.length >= 3 ? value.filter((symbol) => DEFAULT_MARKET_ORDER.includes(symbol)) : [...DEFAULT_MARKET_ORDER]; } catch { return [...DEFAULT_MARKET_ORDER]; } }

function updateClock() { const now = new Date(); $("#time").textContent = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); updateMarketSession(now); }

async function loadTradingViewStatus() {
  const chip = $("#tradingview-status");
  if (!chip) return;
  try {
    const status = await fetch("/api/tradingview/status").then((response) => {
      if (!response.ok) throw new Error("status unavailable");
      return response.json();
    });
    const ready = status.webhookConfigured && status.advancedChartsEnabled && status.pineParity === "CERTIFIED";
    const partial = status.datafeedReady || status.webhookConfigured || status.advancedChartsEnabled;
    chip.className = `integration-chip ${ready ? "is-ready" : partial ? "is-partial" : "is-pending"}`;
    chip.querySelector("small").textContent = ready
      ? "Connected · Pine parity certified"
      : status.datafeedReady ? "Datafeed ready · Pine parity pending" : `Setup required · ${status.pineParity === "AWAITING_PINE_PARITY" ? "Pine parity pending" : "connection pending"}`;
    chip.title = `Datafeed: ${status.datafeedReady ? "ready" : "missing"} · Webhook: ${status.webhookConfigured ? "configured" : "missing"} · Advanced Charts: ${status.advancedChartsEnabled ? "enabled" : "pending"} · Strategy: ${status.pineParity}`;
  } catch {
    chip.className = "integration-chip is-error";
    chip.querySelector("small").textContent = "Status unavailable";
  }
}

async function loadTradingViewSignals() {
  const strip = $("#tradingview-signal-strip");
  if (!strip) return;
  try {
    const payload = await fetch("/api/tradingview/signals?limit=6").then((response) => response.ok ? response.json() : Promise.reject(new Error("signals unavailable")));
    const signals = Array.isArray(payload.signals) ? payload.signals : [];
    strip.hidden = signals.length === 0;
    if (!signals.length) { strip.innerHTML = ""; return; }
    strip.innerHTML = `<header><span>TRADINGVIEW SIGNALS</span><small>Evidence only · Pine parity pending</small></header>${signals.map((item) => `<button type="button" data-tv-symbol="${escapeHtml(item.signal?.symbol || "")}"><b>${escapeHtml(item.signal?.symbol || "—")}</b><span>${escapeHtml(String(item.signal?.event || "").replaceAll("_", " "))}</span><em>${escapeHtml(item.signal?.timeframe || "—")} · ${item.verification?.point886 == null ? "0.886 unavailable" : `0.886 ${formatNumber(item.verification.point886, 2)}`}</em><small>${escapeHtml(item.verification?.status || "UNVERIFIED")}</small></button>`).join("")}`;
    strip.querySelectorAll("[data-tv-symbol]").forEach((button) => button.addEventListener("click", () => openSymbol(button.dataset.tvSymbol)));
  } catch { strip.hidden = true; }
}

function newYorkParts(value) { const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(value); const read = (type) => parts.find((part) => part.type === type)?.value; return { year: Number(read("year")), month: Number(read("month")), day: Number(read("day")), hour: Number(read("hour")), minute: Number(read("minute")), weekday: read("weekday") }; }
function nyOffset(value) { const text = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" }).formatToParts(value).find((part) => part.type === "timeZoneName")?.value || "GMT"; const match = text.match(/GMT([+-])(\d{2}):(\d{2})/); if (!match) return 0; const minutes = Number(match[2]) * 60 + Number(match[3]); return match[1] === "+" ? minutes : -minutes; }
function nyToUtc({ year, month, day, hour, minute }) { const local = Date.UTC(year, month - 1, day, hour, minute); let timestamp = local; for (let attempt = 0; attempt < 2; attempt += 1) timestamp = local - nyOffset(new Date(timestamp)) * 60000; return timestamp; }
function countdown(milliseconds) { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60].map((part) => String(part).padStart(2, "0")).join(":"); }
function marketSession(now) { const parts = newYorkParts(now), weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday), minutes = parts.hour * 60 + parts.minute, weekdayOpen = weekday >= 1 && weekday <= 5, today = { year: parts.year, month: parts.month, day: parts.day }; if (weekdayOpen && minutes >= 570 && minutes < 960) return { open: true, label: "Closes in", duration: nyToUtc({ ...today, hour: 16, minute: 0 }) - now.getTime() }; let addDays = 0; if (!weekdayOpen || minutes >= 960) { addDays = 1; while (true) { const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + addDays)); const day = candidate.getUTCDay(); if (day >= 1 && day <= 5) break; addDays += 1; } } const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + addDays)); return { open: false, label: "Opens in", duration: nyToUtc({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate(), hour: 9, minute: 30 }) - now.getTime() }; }
function updateMarketSession(now) { const state = marketSession(now), card = $("#market-session"); card.classList.toggle("is-open", state.open); card.classList.toggle("is-closed", !state.open); $("#market-state").textContent = state.open ? "Market: Open" : "Market: Closed"; $("#market-countdown").textContent = `${state.label} ${countdown(state.duration)}`; }

function quoteCard({ label, symbol, quote, displayUnit }) {
  const price = Number(quote?.price), changeRaw = quote?.change, change = changeRaw === null || changeRaw === undefined ? NaN : Number(changeRaw), live = Number.isFinite(price);
  const displayPrice = !live ? "—" : displayUnit === "percent" ? `${price.toFixed(2)}%` : displayUnit === "points" ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : money.format(price);
  const chartable = symbol !== "USDT.D";
  return `<button class="market ${live ? (Number.isFinite(change) ? (change >= 0 ? "up" : "down") : "neutral") : "off"}" ${chartable ? `data-chart-symbol="${safe(symbol)}"` : ""} ${quote?.source ? `title="${safe(quote.source)}"` : ""}><span>${safe(label)}</span><b>${displayPrice}</b><small>${live && Number.isFinite(change) ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : live ? "Live dominance" : "Feed unavailable"}</small><em>${safe(symbol)}</em></button>`;
}

const chartSymbolMap = { DXY: "DX-Y.NYB", BTC: "BTC-USD", GOLD: "GC=F", NQ: "NQ=F", ES: "ES=F", US10Y: "^TNX", VIX: "^VIX" };
const CHART_RANGE_LABELS = { "15m": "15M", "4h": "4H", "1d": "1D", "1w": "1W", "1mo": "1M", "3mo": "3M", "1y": "1Y" };

function intelligenceItems(data) {
  const feed = Array.isArray(data.feed) ? data.feed : [];
  const timeline = data.homeSummary?.intelligenceTimeline || {};
  const timelineItems = Object.values(timeline).flatMap((items) => Array.isArray(items) ? items : []);
  const source = feed.length ? feed : timelineItems.length ? timelineItems : (data.brief || []);
  const personalReasons = new Map((data.homeSummary?.todayForYou || []).map((item) => [item.headline, item.priorityReason]));
  return source.map((item, index) => {
    const symbols = item.affectedAssets || item.relatedTickers || [];
    const title = item.headline || "Market signal";
    return {
      id: item.id || item.claimId || index,
      title,
      symbols,
      assets: symbols.slice(0, 3).join(" · ") || item.eventType || "Global market",
      score: Number(item.attentionScore ?? item.importanceScore ?? 0),
      detail: item.whyItMatters || item.marketImpactPrediction || "Verified live intelligence signal.",
      priorityReason: personalReasons.get(title) || null,
      publishedAt: item.publishedAt || item.occurredAt || item.eventTime || null,
    };
  }).sort((left, right) => right.score - left.score || String(left.title).localeCompare(String(right.title)));
}

function bindSymbols() { document.querySelectorAll("[data-symbol]").forEach((element) => element.addEventListener("click", () => openSymbol(element.dataset.symbol))); }

function openChartWorkspace(symbol) {
  if (symbol) activeChartSymbol = symbol;
  showWorkspace("chart");
  loadMainChart();
}

function bindChartSymbols() { document.querySelectorAll("[data-chart-symbol]").forEach((element) => element.addEventListener("click", () => openChartWorkspace(element.dataset.chartSymbol))); }

function recommendationCards(items) {
  return (items || []).map((item) => {
    const confidence = Math.round(Number(item.qualityScore ?? item.confidenceScore ?? 0));
    const action = String(item.action || "MONITOR").toUpperCase();
    const reasoning = String(item.reasoning || "The committee found no urgent change in the verified evidence.");
    const concentration = reasoning.match(/(?:makes up|concentration(?: is| of)?)\s+(\d+(?:\.\d+)?)%/i);
    let plainReason = "No urgent change in the verified evidence.";
    if (concentration) plainReason = `This position contributes to a ${concentration[1]}% portfolio concentration.`;
    else if (/rate hike|rate-sensitive|interest rate/i.test(reasoning)) plainReason = "Higher-rate risk may pressure this position.";
    else if (/no single dominant news event|no.*catalyst/i.test(reasoning)) plainReason = "No strong catalyst currently supports the position.";
    else if (/momentum/i.test(reasoning)) plainReason = "Momentum is not strong enough for the current risk.";
    else plainReason = reasoning.split(/[.;]/)[0].replace(/^['“”]+|['“”]+$/g, "").slice(0, 116);
    const actionLabel = ({ BUY:"Consider buying", REDUCE:"Consider reducing", EXIT:"Consider exiting", HOLD:"Keep holding", MONITOR:"Keep watching" })[action] || "Review position";
    const icon = ({ BUY:"↗", REDUCE:"↘", EXIT:"×", HOLD:"—", MONITOR:"◎" })[action] || "◎";
    return `<button data-symbol="${safe(item.symbol)}" class="recommendation-card action-${safe(action.toLowerCase())}" aria-label="Open ${safe(item.symbol)} analysis"><header>${symbolLogo(item.symbol)}<div><b>${safe(item.symbol)}</b><small>${safe(actionLabel)}</small></div><em>${confidence}/100</em></header><p><strong>Why now</strong>${safe(plainReason)}</p><footer><span class="recommendation-card__meter"><i style="--quality:${Math.max(0, Math.min(100, confidence))}%"></i></span><small>Evidence strength</small><b>Open analysis →</b></footer></button>`;
  }).join("") || '<p class="empty">No active decision clears the committee threshold right now.</p>';
}

function compactMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function verifiedWeeklyApproval(item) {
  const blockers = Array.isArray(item?.committee?.blockers) ? item.committee.blockers : [];
  return item?.committee?.approved === true && item?.weekly?.signalEligible === true && blockers.length === 0;
}

function evidenceFreshness(value) {
  if (!value) return "Update time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Update time unavailable" : `Updated ${date.toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}`;
}

function renderInsiderOpportunities(data) {
  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
  // Discovery feeds are useful for finding filings, but they are not evidence.
  // Only the independently re-fetched SEC Form 4 code-P results may reach the UI.
  const approved = opportunities.filter((item) => item.committee?.approved);
  const shown = [...(approved.length ? approved : opportunities)].sort((a, b) => Number(b.unusualActivity?.score || 0) - Number(a.unusualActivity?.score || 0) || Number(b.committee?.score || 0) - Number(a.committee?.score || 0)).slice(0, 4);
  const coverage = data?.coverage || {};
  $("#insider-scan-meta").textContent = `Daily event scan · updated ${data?.generatedAt ? new Date(data.generatedAt).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : "today"}`;
  $("#insider-stats").innerHTML = `<span><b>${Number(coverage.discoveredRecentBuySymbols || 0)}</b><small>recent buy symbols discovered</small></span><span><b>${Number(coverage.candidatesWithOpenMarketBuys || 0)}</b><small>verified by SEC Form 4</small></span><span class="amber"><b>${Number(coverage.unusualPurchases || 0)}</b><small>unusual purchases</small></span><span class="green"><b>${Number(coverage.approved || 0)}</b><small>committee-approved watches</small></span>`;
  $("#insider-method-copy").textContent = `${data?.methodology?.discovery || "Public latest-filing discovery"} → ${data?.methodology?.verification || "independent SEC EDGAR verification"}. A notable purchase is shown even when the committee does not recommend the stock.`;
  if (!shown.length) {
    const discovered = Number(coverage.discoveredRecentBuySymbols || 0);
    $("#insider-opportunity-list").innerHTML = `<div class="insider-empty"><b>${discovered ? "Recent buys were discovered, but none passed SEC verification yet" : "No recent open-market buy was discovered in the public daily feed"}</b><span>${discovered ? `${discovered} symbols were checked. Unverified or non-P transactions are intentionally hidden.` : "This is a valid daily result, not placeholder data. Try Refresh daily scan after new Form 4 filings arrive."}</span></div>`;
    return;
  }
  $("#insider-opportunity-list").innerHTML = shown.map((item) => {
    const score = Math.max(0, Math.min(100, Number(item.unusualActivity?.score || 0)));
    const votes = item.committee?.votes || {};
    const latestBuyer = item.insider?.buyers?.[0];
    const status = item.committee?.approved ? "COMMITTEE APPROVED" : item.unusualActivity?.label || "VERIFIED BUY";
    const reversal = item.reversalSignal?.status && item.reversalSignal.status !== "NOT TRIGGERED" ? `<div class="insider-card__reversal"><b>${safe(item.reversalSignal.status)}</b><span>${safe(item.reversalSignal.drawdownPct ?? "—")}% drawdown · ${safe(item.reversalSignal.distanceTo886Pct ?? "—")}% from 0.886</span></div>` : "";
    const reasons = Array.isArray(item.unusualActivity?.reasons) && item.unusualActivity.reasons.length ? item.unusualActivity.reasons.join(" · ") : "Verified discretionary open-market purchase";
    return `<article class="insider-card ${item.committee?.approved ? "approved" : "review"}" data-symbol="${safe(item.symbol)}" tabindex="0" role="button" aria-label="Open ${safe(item.symbol)} analysis">
      <div class="insider-card__score" style="--insider-score:${score}%"><span><b>${score}</b><small>ACTIVITY</small></span></div>
      <section><div class="insider-card__title">${symbolLogo(item.symbol)}<div><b>${safe(item.symbol)}</b><small>${safe(item.company)}</small></div><em>${safe(status)}</em></div>
      ${reversal}<div class="insider-card__facts"><span><small>OPEN-MARKET BUY</small><b>${compactMoney(item.insider?.totalValue)}</b></span><span><small>AVG PURCHASE</small><b>${Number.isFinite(Number(item.insider?.averagePrice)) ? money.format(item.insider.averagePrice) : "—"}</b></span><span><small>BUYERS</small><b>${Number(item.insider?.distinctBuyers || 0)}</b></span><span><small>LATEST</small><b>${safe(item.insider?.latestPurchaseDate || "—")}</b></span></div>
      <div class="insider-card__consensus"><i style="--approval:${Math.max(0, Math.min(100, Number(item.committee?.score || 0)))}%"></i><span>Committee ${Number(item.committee?.score || 0)}/100 · ${Number(votes.bullish || 0)} positive · ${Number(votes.bearish || 0)} negative</span><strong>${Number(item.committee?.coveragePct || 0)}% coverage</strong></div>
      <p><b>${safe(reasons)}</b><br>${latestBuyer ? `${safe(latestBuyer.name || "Verified insider")} · ${safe(latestBuyer.role || "Insider")} · ${Number(latestBuyer.shares || 0).toLocaleString()} shares` : "Verified SEC filing"}</p><div class="evidence-provenance"><b>SEC EDGAR · Form 4 · code P</b><span>${safe(evidenceFreshness(item.generatedAt || data?.generatedAt))}</span></div>${item.filingUrl ? `<a class="insider-filing-link" data-filing-link href="${safe(item.filingUrl)}" target="_blank" rel="noreferrer">Open SEC Form 4 ↗</a>` : ""}</section></article>`;
  }).join("");
  bindSymbols();
  document.querySelectorAll("[data-filing-link]").forEach((link) => link.addEventListener("click", (event) => event.stopPropagation()));
}

async function loadInsiderOpportunities(force = false) {
  const container = $("#insider-opportunity-list");
  if (force) container.innerHTML = '<div class="insider-loading"><i></i><span>Refreshing SEC filings and committee evidence…</span></div>';
  try {
    const response = await fetch(`/api/insider-opportunities${force ? "?refresh=true" : ""}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Insider scan unavailable");
    renderInsiderOpportunities(payload);
  } catch (error) {
    container.innerHTML = `<div class="insider-empty error"><b>Insider radar unavailable</b><span>${safe(error.message)}</span></div>`;
  }
}

function renderDailyAgentPicks(data) {
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  const prepared = categories.map((group) => {
    const picks = Array.isArray(group.picks) ? group.picks : [];
    const candidates = Array.isArray(group.candidates) ? group.candidates : [];
    return { group, candidates, stories: Array.isArray(group.stories) ? group.stories : [], rows: [...picks.map((pick) => ({ ...pick, rowStatus: "VERIFIED" })), ...candidates.map((pick) => ({ ...pick, rowStatus: pick.status || "REVIEW" }))] };
  });
  const activeGroups = prepared.filter((entry) => entry.rows.length || entry.stories.length);
  const quietGroups = prepared.filter((entry) => !entry.rows.length && !entry.stories.length);
  const gold = Array.isArray(data?.goldPicks) ? data.goldPicks : [];
  const goldOpportunities = Array.isArray(data?.goldOpportunities) ? data.goldOpportunities : gold.map((pick) => ({ ...pick, state: "CONFIRMED", independentConfirmationCount: Math.max(0, Number(pick.coverage || 1) - 1) }));
  $("#daily-agent-picks-meta").textContent = `${activeGroups.length} agents found actionable evidence · ${quietGroups.length} returned no verified pick · updated ${data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }) : "now"}`;
  $("#gold-picks").innerHTML = goldOpportunities.length ? `<header><span>✦ STRATEGY HORIZON</span><b>Radar → Watch → Confirmed</b></header>${goldOpportunities.map((pick) => `<button type="button" class="gold-state gold-state--${safe(String(pick.state || "RADAR").toLowerCase())}" data-symbol="${safe(pick.symbol)}">${symbolLogo(pick.symbol, "large")}<span>${safe(pick.state || "RADAR")}</span><b>${safe(pick.symbol)}</b><strong>${Number(pick.score || 0)}/100</strong></button>`).join("")}` : `<div class="gold-picks__empty"><span>✦ STRATEGY HORIZON</span><b>No verified weekly setup is inside the 5% zone</b><small>Missing data never becomes a synthetic candidate.</small></div>`;
  const pickRow = (pick) => `<button type="button" class="${pick.rowStatus === "VERIFIED" ? "is-verified" : "is-review"}" data-symbol="${safe(pick.symbol)}">${symbolLogo(pick.symbol)}<span><b>${safe(pick.symbol)} <i>${safe(pick.rowStatus)}</i></b><small>${safe(pick.signal)}</small></span><strong>${Number(pick.score || 0)}</strong></button>`;
  const groupBody = (group, rows) => {
    if (group.stories?.length) return `<div class="official-story-grid">${group.stories.map((story) => `<article class="official-story"><header><span>PRIMARY SOURCE</span><strong>${Number(story.score || 0)}/100</strong></header><h4>${safe(story.headline)}</h4><p>${safe(story.whyItMatters)}</p><footer><small>${safe(story.sourceName)} · ${story.publishedAt ? safe(new Date(story.publishedAt).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })) : "latest"}</small>${story.sourceUrl ? `<a href="${safe(story.sourceUrl)}" target="_blank" rel="noreferrer">Source ↗</a>` : ""}</footer></article>`).join("")}</div>`;
    if (group.id !== "short-flow") return `<div class="agent-pick-group__list">${rows.map(pickRow).join("")}</div>`;
    const shortRows = rows.filter((pick) => pick.direction === "BEARISH_FLOW");
    const marketRows = rows.filter((pick) => pick.direction !== "BEARISH_FLOW");
    return `<div class="agent-flow-split"><section class="flow-side flow-side--short"><h4>Short Pressure</h4><div class="agent-pick-group__list">${shortRows.map(pickRow).join("") || "<span class=\"flow-empty\">No unusual short flow</span>"}</div></section><section class="flow-side flow-side--market"><h4>Non-short Flow</h4><div class="agent-pick-group__list">${marketRows.map(pickRow).join("") || "<span class=\"flow-empty\">No verified market-flow leader</span>"}</div></section></div>`;
  };
  $("#daily-agent-picks-list").innerHTML = activeGroups.length ? activeGroups.map(({ group, candidates, rows, stories }) => `<article class="agent-pick-group agent-${safe(group.id)}"><header><div><span>${safe(group.title)}</span><small>${safe(group.source)}</small></div><b>${Number(stories.length || group.count || 0)} verified${candidates.length ? ` · ${candidates.length} review` : ""}</b></header>${groupBody(group, rows)}</article>`).join("") : '<div class="agent-board-empty"><b>No agent found a verified pick today</b><span>This is a valid result. The committee will not manufacture a recommendation.</span></div>';
  bindSymbols();
}

async function loadDailyAgentPicks(force = false) {
  const container = $("#daily-agent-picks-list");
  if (force) container.innerHTML = '<div class="insider-loading"><i></i><span>Refreshing every daily specialist list…</span></div>';
  try {
    const response = await fetch(`/api/daily-agent-picks${force ? "?refresh=true" : ""}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Daily agent board unavailable");
    renderDailyAgentPicks(payload);
  } catch (error) {
    container.innerHTML = `<div class="insider-empty error"><b>Daily agent board unavailable</b><span>${safe(error.message)}</span></div>`;
  }
}

function renderEarthOpportunities(items = [], message = "") {
  const container = $("#earth-opportunities");
  if (!container) return;
  const candidates = items
    .filter((item) => verifiedWeeklyApproval(item) && Number(item?.committee?.score) >= 65)
    .sort((left, right) => Number(right.committee.score) - Number(left.committee.score))
    .slice(0, 4);
  const legend = '<div class="earth-opportunities__legend"><b>Strategy horizon</b><span>Weekly 0.886 candidates · committee scored</span></div>';
  if (!candidates.length) {
    container.innerHTML = `${legend}<div class="earth-opportunities__empty"><b>${safe(message || "No qualified setup on the horizon")}</b><span>The globe stays clear until verified weekly data passes the strategy scan.</span></div>`;
    return;
  }

  container.innerHTML = legend + candidates.map((item, index) => {
    const weekly = item.weekly || {};
    const committee = item.committee || {};
    const score = Math.round(Math.max(0, Math.min(100, Number(committee.score) || 0)));
    const approved = verifiedWeeklyApproval(item);
    const state = "Approved watch";
    const distance = Number(weekly.distancePct);
    const description = `${item.symbol}: ${score} out of 100, ${state}. ${Number.isFinite(distance) ? `${Math.abs(distance).toFixed(2)} percent from the 0.886 point.` : "Distance unavailable."}`;
    return `<button class="earth-opportunity earth-opportunity--${index + 1} ${approved ? "approved" : "review"}" data-chart-symbol="${safe(item.symbol)}" aria-label="${safe(description)}" title="${safe(description)}"><span>${symbolLogo(item.symbol, "large")}<b>${safe(item.symbol)}</b><strong>${score}</strong><small>${approved ? "Approved" : "Review"}</small></span></button>`;
  }).join("");

  container.querySelectorAll("[data-chart-symbol]").forEach((element) => element.addEventListener("click", () => {
    activeChartSymbol = element.dataset.chartSymbol;
    loadMainChart();
    $("#live-chart").scrollIntoView({ behavior: "smooth", block: "center" });
  }));
}

function renderWeeklyFibonacciOpportunities(data) {
  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
  const approved = (Array.isArray(data?.approvedOpportunities) ? data.approvedOpportunities : opportunities).filter(verifiedWeeklyApproval);
  const shown = approved.slice(0, 4);
  const coverage = data?.coverage || {};
  $("#weekly-fib-meta").textContent = `${coverage.configuredUniverse || 0} official US stocks · ${coverage.scanned || 0} scanned (${coverage.progressPct || 0}%) · ${coverage.remaining || 0} remaining · ${coverage.approved || 0} approved · ${data?.universe?.source || "verified directory"} · ${evidenceFreshness(data?.generatedAt)}`;
  $("#weekly-fib-method").textContent = `${data?.universe?.source || "Official universe connecting"} · ${data?.methodology?.timeframe || "Weekly candles only"} · ${data?.methodology?.anchor || "low to later high"} · decision threshold ${data?.methodology?.approvalThreshold || 65}/100`;
  if (!shown.length) {
    $("#weekly-fib-list").innerHTML = `<div class="insider-empty"><b>No committee-approved weekly 0.886 setup in the covered stocks yet</b><span>${Number(coverage.scanned || 0)} of ${Number(coverage.configuredUniverse || 0)} official US stocks checked. ${coverage.cycleComplete ? "Full cycle complete." : `${Number(coverage.remaining || 0)} continue automatically.`} Rejected candidates are never shown as recommendations.</span></div>`;
    renderEarthOpportunities([], "No qualified weekly setup right now");
    return;
  }
  $("#weekly-fib-list").innerHTML = shown.map((item) => {
    const weekly = item.weekly || {}, committee = item.committee || {}, votes = committee.votes || {};
    const score = Math.max(0, Math.min(100, Number(committee.score || 0)));
    const distance = Number(weekly.distancePct);
    return `<button class="weekly-fib-card approved" data-chart-symbol="${safe(item.symbol)}">
      <div class="weekly-fib-card__score" style="--weekly-score:${score}%"><span><b>${score}</b><small>/100</small></span></div>
      <section><div class="weekly-fib-card__title">${symbolLogo(item.symbol)}<div><b>${safe(item.symbol)}</b><small>${safe(weekly.status || "WEEKLY REVIEW")}</small></div><em>${safe(committee.label || "REVIEW")}</em></div>
      <div class="weekly-fib-card__prices"><span><small>NOW</small><b>${Number.isFinite(Number(weekly.currentPrice)) ? money.format(weekly.currentPrice) : "—"}</b></span><span><small>0.886 POINT</small><b>${Number.isFinite(Number(weekly.targetPrice)) ? money.format(weekly.targetPrice) : "—"}</b></span><span><small>DISTANCE</small><b>${Number.isFinite(distance) ? `${distance.toFixed(2)}%` : "—"}</b></span><span><small>WEEKLY BARS</small><b>${Number(weekly.weeklyBars || 0)}</b></span></div>
      <div class="weekly-fib-card__track"><i style="--proximity:${Math.max(3, 100 - Math.min(100, Math.abs(distance || 0) * 12))}%"></i></div>
      <div class="weekly-fib-card__votes"><span>${Number(votes.bullish || 0)} bullish · ${Number(votes.neutral || 0)} neutral · ${Number(votes.bearish || 0)} bearish</span><strong>${Number(committee.coveragePct || 0)}% coverage</strong></div><div class="evidence-provenance"><b>${safe(data?.universe?.source || "Verified US equity directory")}</b><span>Completed weekly candles</span><span>${safe(evidenceFreshness(item.generatedAt || data?.generatedAt))}</span></div></section></button>`;
  }).join("");
  renderEarthOpportunities(shown);
  bindChartSymbols();
}

async function loadWeeklyFibonacciOpportunities(force = false) {
  const container = $("#weekly-fib-list");
  if (force) container.innerHTML = '<div class="insider-loading"><i></i><span>Refreshing weekly candles and committee evidence…</span></div>';
  try {
    const response = await fetch(`/api/weekly-fibonacci-opportunities${force ? "?refresh=true" : ""}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Weekly Fibonacci scan unavailable");
    renderWeeklyFibonacciOpportunities(payload);
  } catch (error) {
    container.innerHTML = `<div class="insider-empty error"><b>Weekly Fibonacci radar unavailable</b><span>${safe(error.message)}</span></div>`;
    renderEarthOpportunities([], "Strategy scan is temporarily unavailable");
  }
}

function renderDashboard(data) {
  dashboardData = data;
  const quoteMap = new Map(data.quotes.map((item) => [item.symbol, item]));
  $("#markets").innerHTML = selectedMarketSymbols.map((symbol) => quoteMap.get(symbol)).filter(Boolean).map(quoteCard).join("");
  $("#markets").style.setProperty("--market-count", selectedMarketSymbols.length);
  $("#market-selection-copy").textContent = `${selectedMarketSymbols.length} assets selected`;
  const connectedQuotes = data.quotes.filter((item) => item.quote?.change !== null && item.quote?.change !== undefined && Number.isFinite(Number(item.quote.change)));
  const positiveQuotes = connectedQuotes.filter((item) => Number(item.quote.change) >= 0).length;
  const liveBreadthScore = connectedQuotes.length ? positiveQuotes / connectedQuotes.length * 100 : NaN;
  const rawCompositeScore = data.sentiment?.score;
  const compositeScore = rawCompositeScore === null || rawCompositeScore === undefined ? NaN : Number(rawCompositeScore);
  const score = Number.isFinite(compositeScore) ? compositeScore : liveBreadthScore;
  const isCompositeSentiment = Number.isFinite(compositeScore);
  $("#sentiment-score").textContent = Number.isFinite(score) ? Math.round(score) : "—";
  const marketToneDial = $("#market-tone-dial");
  marketToneDial.style.setProperty("--market-score", `${Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0}%`);
  marketToneDial.classList.toggle("is-defensive", Number.isFinite(score) && score <= 40);
  marketToneDial.classList.toggle("is-balanced", !Number.isFinite(score) || (score > 40 && score < 60));
  marketToneDial.classList.toggle("is-constructive", Number.isFinite(score) && score >= 60);
  $("#sentiment-label").textContent = !Number.isFinite(score)
    ? "Not enough live data"
    : isCompositeSentiment
      ? score >= 60 ? "Markets lean positive" : score <= 40 ? "Markets lean cautious" : "Markets are mixed"
      : `${positiveQuotes} of ${connectedQuotes.length} markets rising`;
  $("#tone-detail").textContent = isCompositeSentiment
    ? `COMBINED SCORE · ${Math.round(Number(data.sentiment?.confidence || 0))}% CONFIDENCE`
    : connectedQuotes.length ? "HIGHER = MORE MARKETS RISING" : "LIVE PRICES ARE UNAVAILABLE";
  marketToneDial.title = isCompositeSentiment
    ? "A combined 0–100 market-direction score built only from currently verified inputs. Higher means a more positive market environment."
    : connectedQuotes.length
      ? `${positiveQuotes} of ${connectedQuotes.length} tracked key markets are rising. The score is the percentage rising right now.`
      : "No score is shown because there are not enough verified live prices.";
  marketToneDial.setAttribute("aria-label", Number.isFinite(score) ? `Market direction score ${Math.round(score)} out of 100. ${$("#sentiment-label").textContent}.` : "Market direction score unavailable because there are not enough verified live prices.");
  const fearReading = (data.sentiment?._dimensionReadings || []).find((item) => item.dimension === "FEAR_GREED" && !item.unavailable);
  const fearRaw = Number(fearReading?.score), fearAvailable = Number.isFinite(fearRaw), fearScore = fearAvailable ? Math.max(0, Math.min(100, Math.round(fearRaw))) : 50;
  const fearState = !fearAvailable ? "AWAITING DATA" : fearScore <= 25 ? "EXTREME FEAR" : fearScore <= 44 ? "FEAR" : fearScore <= 55 ? "NEUTRAL" : fearScore <= 74 ? "GREED" : "EXTREME GREED";
  const fearDial = $("#fear-greed-dial"); fearDial.style.setProperty("--fear-score", fearScore); fearDial.classList.toggle("is-fear", fearAvailable && fearScore < 45); fearDial.classList.toggle("is-neutral", !fearAvailable || (fearScore >= 45 && fearScore <= 55)); fearDial.classList.toggle("is-greed", fearAvailable && fearScore > 55); fearDial.setAttribute("aria-label", fearAvailable ? `Fear and Greed Index: ${fearScore} out of 100, ${fearState.toLowerCase()}` : "Fear and Greed Index unavailable"); $("#fear-greed-value").textContent = fearAvailable ? fearScore : "—"; $("#fear-greed-state").textContent = fearState;
  const cot = data.weeklyCot, cotTotal = Number(cot?.totalVolume), cotAvailable = cot?.available && cotTotal > 0, cotLong = cotAvailable ? Number(cot.longVolume) / cotTotal * 100 : 0, cotShort = cotAvailable ? Number(cot.shortVolume) / cotTotal * 100 : 0;
  const cotDial = $("#cot-dial"); cotDial.classList.toggle("is-unavailable", !cotAvailable); cotDial.classList.toggle("is-long", cotAvailable && cotLong >= cotShort); cotDial.classList.toggle("is-short", cotAvailable && cotShort > cotLong); cotDial.style.setProperty("--cot-long", `${cotLong}%`); cotDial.style.setProperty("--cot-short", `${cotShort}%`); cotDial.setAttribute("aria-label", cotAvailable ? `Weekly COT report: ${cotLong.toFixed(1)} percent long, ${cotShort.toFixed(1)} percent short, ${cot.signal}` : "No verified weekly CFTC COT report is currently available"); $("#cot-long-value").textContent = cotAvailable ? `${cotLong.toFixed(0)}%` : "—"; $("#cot-short-value").textContent = cotAvailable ? `${cotShort.toFixed(0)}%` : "—"; $("#cot-direction").textContent = cotAvailable ? String(cot.signal).toUpperCase() : "NO VERIFIED REPORT"; $("#cot-report-date").textContent = cotAvailable ? `CFTC · ${cot.reportDate || "LATEST"}` : "CFTC DATA UNAVAILABLE";
  const agents = data.intelligence || {}, liveAgents = Number(agents.fulfilled || 0), totalAgents = Number(agents.total || 0), unavailable = Number(agents.unavailable || 0) + Number(agents.failed || 0);
  const sentimentConfidence = isCompositeSentiment
    ? Number(data.sentiment?.confidence)
    : data.quotes.length ? connectedQuotes.length / data.quotes.length * 100 : NaN;
  const consensusScore = Number.isFinite(score) ? Math.round(score) : null;
  const consensusDirection = consensusScore === null ? "AWAITING DIRECTION" : consensusScore >= 60 ? "CONSTRUCTIVE" : consensusScore <= 40 ? "DEFENSIVE" : "BALANCED";
  $("#consensus-score").textContent = consensusScore === null ? "—" : `${consensusScore}`;
  $("#consensus-meter").style.width = `${consensusScore ?? 0}%`;
  $("#consensus-direction").textContent = consensusDirection;
  $("#consensus-coverage").textContent = totalAgents ? `${liveAgents}/${totalAgents} VERIFIED AGENTS` : "SOURCE COVERAGE UNAVAILABLE";
  $("#network-title").textContent = consensusScore === null ? "Verified consensus unavailable" : `${consensusDirection.toLowerCase()} market posture`;
  $("#network-copy").textContent = totalAgents ? `${liveAgents} verified feeds · ${Number.isFinite(sentimentConfidence) ? Math.round(sentimentConfidence) : 0}/100 input coverage. ${unavailable ? `${unavailable} unavailable source${unavailable === 1 ? " is" : "s are"} excluded.` : "All connected sources responded."}` : "No verified source status was returned.";

  const items = intelligenceItems(data);
  const portfolio = data.portfolio || {}, positions = portfolio.positions || [];
  $("#priority-count").textContent = `${items.length} verified signal${items.length === 1 ? "" : "s"}`;
  $("#events-context").textContent = items.length ? `${Math.min(3, items.length)} verified events · updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No verified event needs your attention right now";
  $("#events").innerHTML = items.length ? items.slice(0, 3).map((item, index) => {
    const symbol = String(item.symbols?.[0] || "").toUpperCase();
    const score = Math.round(Number(item.score || 0));
    return `<li class="market-story market-story--${index + 1}"><button class="priority-event" ${symbol ? `data-symbol="${safe(symbol)}"` : ""} title="${safe(item.detail)}"><span class="market-story__visual">${symbol ? symbolLogo(symbol, "large") : '<span class="market-story__signal" aria-hidden="true">✦</span>'}<em>${score}<small>IMPACT</small></em></span><span class="market-story__copy"><small>${safe(item.assets || symbol || "MARKET")}</small><b>${safe(item.title)}</b><em>${safe(item.priorityReason || "Verified market-moving event")}</em><strong>View story →</strong></span></button></li>`;
  }).join("") : '<li class="empty">No verified high-priority intelligence is available yet.</li>';
  const portfolioTotal = Math.max(Number(portfolio.totalValue || 0), 0);
  const exposurePositions = [...positions].sort((left, right) => Math.abs(Number(right.marketValue || 0)) - Math.abs(Number(left.marketValue || 0))).slice(0, 4);
  $("#portfolio-radar-meta").textContent = positions.length ? `${positions.length} live positions · largest exposures first` : "No open position exposure";
  $("#signals").innerHTML = exposurePositions.length ? exposurePositions.map((position) => {
    const weight = portfolioTotal > 0 ? Math.abs(Number(position.marketValue || 0)) / portfolioTotal * 100 : 0;
    const symbol = String(position.symbol || "").toUpperCase();
    const logo = position.companyLogo ? `<img src="${safe(position.companyLogo)}" alt="" loading="lazy" />` : "";
    return `<button class="signal-item exposure-item" data-symbol="${safe(symbol)}" title="Open live analysis for ${safe(symbol)}"><span class="position-logo">${logo}<b aria-hidden="true">${safe(symbol.slice(0, 2))}</b></span><span><b>${safe(symbol)} <em class="position-side ${position.direction === "SHORT" || Number(position.quantity) < 0 ? "short" : "long"}">${position.direction || (Number(position.quantity) < 0 ? "SHORT" : "LONG")}</em></b><small>${safe(position.sector || "Unclassified sector")} · ${money.format(Math.abs(Number(position.marketValue || 0)))}</small></span><strong>${weight.toFixed(0)}%</strong></button>`;
  }).join("") : '<p class="empty">Open a paper position to see live portfolio concentration here.</p>';
  $("#signals").querySelectorAll(".position-logo img").forEach((image) => image.addEventListener("error", () => { image.hidden = true; }, { once: true }));

  $("#portfolio-total").textContent = Number.isFinite(Number(portfolio.totalValue)) ? money.format(portfolio.totalValue) : "—";
  $("#portfolio-action-copy").textContent = `${positions.length} positions · ${Number.isFinite(Number(portfolio.totalReturnPct)) ? `${Number(portfolio.totalReturnPct).toFixed(2)}% return` : "live"}`;
  $("#portfolio-kpis").innerHTML = `<div><span>Total return</span><b class="${Number(portfolio.totalReturnPct) >= 0 ? "gain" : "loss"}">${Number.isFinite(Number(portfolio.totalReturnPct)) ? `${portfolio.totalReturnPct > 0 ? "+" : ""}${Number(portfolio.totalReturnPct).toFixed(2)}%` : "—"}</b></div><div><span>Cash</span><b>${Number.isFinite(Number(portfolio.cashBalance)) ? money.format(portfolio.cashBalance) : "—"}</b></div><div><span>Daily P/L</span><b class="${Number(portfolio.dailyPnl) >= 0 ? "gain" : "loss"}">${Number.isFinite(Number(portfolio.dailyPnl)) ? money.format(portfolio.dailyPnl) : "—"}</b></div>`;
  $("#positions").innerHTML = positions.slice(0, 6).map((position) => `<div class="position-row"><button data-symbol="${safe(position.symbol)}"><span><b>${safe(position.symbol)} <em class="position-side ${position.direction === "SHORT" || Number(position.quantity) < 0 ? "short" : "long"}">${position.direction || (Number(position.quantity) < 0 ? "SHORT" : "LONG")}</em></b><small>${safe(position.sector)} · ${Math.abs(Number(position.quantity))} shares</small></span><span><b>${money.format(Math.abs(Number(position.marketValue)))}</b><small class="${position.unrealizedPnlPct >= 0 ? "gain" : "loss"}">${position.unrealizedPnlPct > 0 ? "+" : ""}${Number(position.unrealizedPnlPct).toFixed(2)}%</small></span></button><button class="close-paper-position" data-close-position="${safe(position.symbol)}" type="button">Close</button></div>`).join("") || '<p class="empty">No open positions.</p>';
  $("#recommendation-items").innerHTML = recommendationCards(data.recommendations);
  const quoteCount = data.quotes.filter((item) => item.quote).length;
  $("#source-status").textContent = `Coverage: ${quoteCount}/${data.quotes.length} market feeds live · ${liveAgents}/${totalAgents || 0} specialist agents reporting · ${positions.length} holdings reviewed`;
  $("#updated").textContent = `Updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  bindSymbols();
  bindChartSymbols();
  document.querySelectorAll("[data-close-position]").forEach((button) => button.addEventListener("click", async () => { const symbol = button.dataset.closePosition; if (!window.confirm(`Close the entire ${symbol} paper position at the current market price?`)) return; button.disabled = true; button.textContent = "Closing…"; try { const response = await fetch("/api/paper-position/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Close failed"); if (paperTradePlan?.symbol === symbol) paperTradePlan = null; await loadDashboard(); renderCurrentChart(); } catch (error) { button.disabled = false; button.textContent = "Close"; window.alert(error.message); } }));
}

function strategyWatchStatus(item) {
  if (!item.dataAvailable) return { tone: "unavailable", label: "WEEKLY DATA NEEDED" };
  if (item.status === "ENTRY ZONE") return { tone: "triggered", label: "ENTRY ZONE ALERT" };
  if (item.status === "WATCHING ABOVE 0.886") return { tone: "watching", label: "WATCHING 0.886" };
  return { tone: "below", label: "BELOW ENTRY ZONE" };
}

function renderStrategyWatchlist(items) {
  const root = $("#watchlist-items");
  if (!items.length) {
    root.innerHTML = '<div class="watchlist-empty"><b>No stocks monitored yet</b><span>Add a US-listed symbol above. ImpactOne will calculate its weekly 0.886 level and monitor the ±5% entry zone automatically.</span></div>';
    return;
  }
  root.innerHTML = items.map((item) => {
    const state = strategyWatchStatus(item);
    const target = Number(item.targetPrice);
    const distance = Number(item.distancePct);
    return `<article class="strategy-watch-card is-${state.tone}">
      <button class="strategy-watch-card__open" data-weekly-watch-symbol="${safe(item.symbol)}" type="button" title="Open ${safe(item.symbol)} with weekly Fibonacci">
        ${symbolLogo(item.symbol)}<span class="strategy-watch-card__identity"><b>${safe(item.symbol)}</b><small>${safe(item.company || "US-listed stock")}</small></span><em>${state.label}</em>
      </button>
      <div class="strategy-watch-card__numbers"><span><small>NOW</small><b>${Number.isFinite(Number(item.currentPrice)) ? money.format(item.currentPrice) : "—"}</b></span><span><small>WEEKLY 0.886</small><b>${Number.isFinite(target) ? money.format(target) : "—"}</b></span><span><small>DISTANCE</small><b>${Number.isFinite(distance) ? `${distance > 0 ? "+" : ""}${distance.toFixed(2)}%` : "—"}</b></span><span><small>ENTRY BAND</small><b>${Number.isFinite(Number(item.lowerPrice)) ? `${money.format(item.lowerPrice)}–${money.format(item.upperPrice)}` : "Unavailable"}</b></span></div>
      <div class="strategy-watch-card__foot"><span>${item.dataAvailable ? `${Number(item.weeklyBars || 0)} weekly candles · ${safe(item.source || "verified provider")}` : safe(item.reason || "Verified weekly history is insufficient")}</span><button data-remove-weekly-watch="${safe(item.symbol)}" type="button" aria-label="Stop monitoring ${safe(item.symbol)}">Remove</button></div>
    </article>`;
  }).join("");
  root.querySelectorAll("[data-weekly-watch-symbol]").forEach((button) => button.addEventListener("click", () => {
    activeChartSymbol = button.dataset.weeklyWatchSymbol;
    activeChartRange = "1w";
    setFibonacciVisible(true);
    openChartWorkspace(activeChartSymbol);
  }));
  root.querySelectorAll("[data-remove-weekly-watch]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    await fetch(`/api/strategy-watchlist/${encodeURIComponent(button.dataset.removeWeeklyWatch)}`, { method: "DELETE" });
    loadStrategyWatchlist();
  }));
}

async function loadStrategyWatchlist(force = false) {
  const message = $("#strategy-watchlist-message");
  try {
    const response = await fetch(`/api/strategy-watchlist${force ? "?refresh=true" : ""}`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Watchlist unavailable");
    renderStrategyWatchlist(payload.items || []);
    message.textContent = payload.items?.some((item) => item.status === "ENTRY ZONE") ? "Entry-zone alert active—open the highlighted stock to review its weekly Fibonacci." : "Automatic weekly monitoring is active.";
  } catch (error) {
    message.textContent = error.message;
    $("#watchlist-items").innerHTML = '<div class="watchlist-empty"><b>Weekly monitoring is temporarily unavailable</b><span>No synthetic target was generated.</span></div>';
  }
}

function renderMarketEditor() { const quoteMap = new Map((dashboardData?.quotes || []).map((item) => [item.symbol, item])); $("#market-editor-items").innerHTML = DEFAULT_MARKET_ORDER.map((symbol) => { const item = quoteMap.get(symbol) || { symbol, label: symbol }, selected = draftMarketSymbols.includes(symbol), order = draftMarketSymbols.indexOf(symbol); return `<article class="market-editor__item ${selected ? "selected" : ""}" data-editor-symbol="${safe(symbol)}"><label><input type="checkbox" ${selected ? "checked" : ""}/><span><b>${safe(item.label)}</b><small>${safe(symbol)}</small></span></label><div><button type="button" data-move="up" ${!selected || order <= 0 ? "disabled" : ""} aria-label="Move ${safe(symbol)} up">↑</button><button type="button" data-move="down" ${!selected || order < 0 || order >= draftMarketSymbols.length - 1 ? "disabled" : ""} aria-label="Move ${safe(symbol)} down">↓</button><em>${selected ? order + 1 : "—"}</em></div></article>`; }).join(""); $("#market-editor-count").textContent = `${draftMarketSymbols.length} selected`; $("#market-editor-error").textContent = ""; bindMarketEditorItems(); }
function bindMarketEditorItems() { document.querySelectorAll("[data-editor-symbol]").forEach((row) => { const symbol = row.dataset.editorSymbol; row.querySelector("input").addEventListener("change", (event) => { if (event.target.checked) draftMarketSymbols.push(symbol); else draftMarketSymbols = draftMarketSymbols.filter((item) => item !== symbol); renderMarketEditor(); }); row.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => { const index = draftMarketSymbols.indexOf(symbol), next = button.dataset.move === "up" ? index - 1 : index + 1; if (index < 0 || next < 0 || next >= draftMarketSymbols.length) return; [draftMarketSymbols[index], draftMarketSymbols[next]] = [draftMarketSymbols[next], draftMarketSymbols[index]]; renderMarketEditor(); })); }); }
function openMarketEditor() { draftMarketSymbols = [...selectedMarketSymbols]; renderMarketEditor(); $("#market-editor").showModal(); }

function movingAveragePoints(bars, period, x, y) {
  if (bars.length < period) return "";
  const points = [];
  let total = 0;
  for (let index = 0; index < bars.length; index += 1) {
    total += Number(bars[index].close);
    if (index >= period) total -= Number(bars[index - period].close);
    if (index >= period - 1) points.push(`${x(index)},${y(total / period)}`);
  }
  return points.join(" ");
}

function nicePriceStep(range, targetTicks = 8) {
  const rough = Math.max(Number(range) || 0, Number.EPSILON) / targetTicks;
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return factor * power;
}

function chartBarsInView() {
  if (!currentChartBars.length) return [];
  if (!chartViewport) return currentChartBars;
  const start = Math.max(0, Math.min(currentChartBars.length - 1, chartViewport.start));
  const end = Math.max(start + 1, Math.min(currentChartBars.length, chartViewport.end));
  return currentChartBars.slice(start, end);
}

function fibonacciForSelectedRange(fibonacci, requestedRange, bars) {
  if (!fibonacci || fibonacci.sourceRange !== requestedRange || !Array.isArray(fibonacci.levels)) return null;
  const times = new Set((bars || []).map((bar) => new Date(bar.date).getTime()).filter(Number.isFinite));
  const lowTime = new Date(fibonacci.swingLowDate).getTime();
  const highTime = new Date(fibonacci.swingHighDate).getTime();
  if (!times.has(lowTime) || !times.has(highTime) || !(highTime > lowTime)) return null;
  if (Number(fibonacci.barCount) !== bars.length) return null;
  return fibonacci;
}

function marketChartSvg(bars) {
  if (!bars.length) return '<div class="chart-empty">No verified chart history is available for this range.</div>';
  const width = 1120, height = 390, left = 58, right = 72, top = 22, volumeHeight = 72, bottom = 28;
  const priceBottom = height - volumeHeight - bottom - 12;
  const lows = bars.map((bar) => Number(bar.low)), highs = bars.map((bar) => Number(bar.high));
  const priceMin = Math.min(...lows), priceMax = Math.max(...highs), pricePadding = Math.max((priceMax - priceMin) * .06, priceMax * .001);
  const min = priceMin - pricePadding, max = priceMax + pricePadding, spread = max - min || 1, maxVolume = Math.max(...bars.map((bar) => Number(bar.volume || 0)), 1);
  const plotWidth = width - left - right, step = plotWidth / bars.length, candleWidth = Math.max(2, Math.min(10, step * .56));
  const y = (value) => top + ((max - Number(value)) / spread) * (priceBottom - top);
  const priceStep = nicePriceStep(spread, 8);
  const decimals = priceStep >= 1 ? 0 : Math.min(4, Math.max(2, Math.ceil(-Math.log10(priceStep))));
  const axisLabel = (value) => value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const firstLevel = Math.floor(min / priceStep) * priceStep;
  const levels = []; for (let value = firstLevel; value <= max + priceStep * .25; value += priceStep) if (value >= min - priceStep * .25) levels.push(value);
  const horizontalGrid = levels.map((value) => `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text x="${width - right + 10}" y="${y(value) + 4}">${axisLabel(value)}</text>`).join("");
  const verticalGrid = Array.from({ length: 13 }, (_, index) => { const gridX = left + (plotWidth * index / 12); return `<line class="grid-vertical" x1="${gridX}" y1="${top}" x2="${gridX}" y2="${height - bottom}"/>`; }).join("");
  const grid = verticalGrid + horizontalGrid;
  const xAt = (index) => left + step * index + step / 2;
  const candles = bars.map((bar, index) => { const x = xAt(index), up = Number(bar.close) >= Number(bar.open), color = up ? "#5ce1ae" : "#f06f83", bodyTop = Math.min(y(bar.open), y(bar.close)), bodyHeight = Math.max(2, Math.abs(y(bar.open) - y(bar.close))), volumeY = height - bottom - (Number(bar.volume || 0) / maxVolume) * volumeHeight; return `<g><line class="wick" x1="${x}" y1="${y(bar.high)}" x2="${x}" y2="${y(bar.low)}" stroke="${color}"/><rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="1" fill="${color}"/>${activeStudies.has("volume") ? `<rect class="volume-bar" x="${x - candleWidth / 2}" y="${volumeY}" width="${candleWidth}" height="${height - bottom - volumeY}" fill="${color}"/>` : ""}</g>`; }).join("");
  const linePoints = bars.map((bar, index) => `${left + step * index + step / 2},${y(bar.close)}`).join(" ");
  const volumeBars = bars.map((bar, index) => { const x = left + step * index + step / 2, volumeY = height - bottom - (Number(bar.volume || 0) / maxVolume) * volumeHeight, color = Number(bar.close) >= Number(bar.open) ? "#5ce1ae" : "#f06f83"; return `<rect class="volume-bar" x="${x - candleWidth / 2}" y="${volumeY}" width="${candleWidth}" height="${height - bottom - volumeY}" fill="${color}"/>`; }).join("");
  const lineChart = `<defs><linearGradient id="main-line-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#75a8ff" stop-opacity=".32"/><stop offset="1" stop-color="#6e67ff" stop-opacity="0"/></linearGradient></defs>${activeChartType === "area" ? `<polygon class="line-area" points="${left},${priceBottom} ${linePoints} ${width - right},${priceBottom}"/>` : ""}<polyline class="price-line" points="${linePoints}"/>${activeStudies.has("volume") ? volumeBars : ""}`;
  const studies = [["sma20",20,"#64d8ff"],["sma50",50,"#d28cff"],["sma200",200,"#f4bd57"]].filter(([key]) => activeStudies.has(key)).map(([key,period,color]) => { const points = movingAveragePoints(bars, period, xAt, y); return points ? `<polyline class="study-line ${key}" points="${points}" stroke="${color}"/>` : ""; }).join("");
  const chartStart = new Date(bars[0].date).getTime(), chartEnd = new Date(bars.at(-1).date).getTime();
  const xForDate = (date) => { const value = new Date(date).getTime(); if (!Number.isFinite(value) || chartEnd === chartStart) return left; return left + Math.max(0, Math.min(1, (value - chartStart) / (chartEnd - chartStart))) * plotWidth; };
  const fibColors = ["#8ba1ba", "#66d0dc", "#8296ad"], fibLevels = Array.isArray(currentFibonacci?.levels) ? currentFibonacci.levels : [];
  const lowTime = new Date(currentFibonacci?.swingLowDate).getTime(), highTime = new Date(currentFibonacci?.swingHighDate).getTime();
  const lowX = xForDate(currentFibonacci?.swingLowDate), highX = xForDate(currentFibonacci?.swingHighDate), fibStart = Math.min(lowX, highX), fibEnd = Math.max(lowX, highX);
  const visibleFibLevels = fibLevels.filter((level) => Number(level.price) >= min && Number(level.price) <= max);
  const anchorsInViewport = Number.isFinite(lowTime) && Number.isFinite(highTime) && lowTime >= chartStart && highTime <= chartEnd;
  const fibDiagonalVisible = anchorsInViewport && Number(currentFibonacci?.swingLow) >= min && Number(currentFibonacci?.swingLow) <= max && Number(currentFibonacci?.swingHigh) >= min && Number(currentFibonacci?.swingHigh) <= max;
  const missingFibCount = fibLevels.length - visibleFibLevels.length;
  const fibRangeLabel = String(currentFibonacci?.sourceRange || activeChartRange).toUpperCase();
  const offscreenFib = fibonacciVisible && currentFibonacci && missingFibCount > 0 ? `<g class="fib-offscreen"><text x="${left + 8}" y="${top + 14}">${fibRangeLabel} FIB · ${axisLabel(currentFibonacci.swingLow)} → ${axisLabel(currentFibonacci.swingHigh)} · ${missingFibCount} level${missingFibCount === 1 ? "" : "s"} outside view</text></g>` : "";
  const fibonacci = fibonacciVisible && currentFibonacci ? `<g class="fib-study">${fibDiagonalVisible ? `<line class="fib-diagonal" x1="${lowX}" y1="${y(currentFibonacci.swingLow)}" x2="${highX}" y2="${y(currentFibonacci.swingHigh)}"/>` : ""}${visibleFibLevels.map((level, index) => { const value = Number(level.price), color = fibColors[index] || fibColors.at(-1); return `<g class="fib-level"><line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="${color}"/><text x="${left + 6}" y="${y(value) - 5}" fill="${color}">${fibRangeLabel} · ${level.ratio === .886 ? "0.886" : Number(level.ratio).toFixed(0)} (${axisLabel(value)})</text></g>`; }).join("")}${offscreenFib}</g>` : "";
  const measurementOverlay = measurement ? (() => { const x1 = measurement.start.x, y1 = measurement.start.y, x2 = measurement.end.x, y2 = measurement.end.y, startPrice = max - ((y1 - top) / (priceBottom - top)) * spread, endPrice = max - ((y2 - top) / (priceBottom - top)) * spread, change = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0, color = change >= 0 ? "#62e1ae" : "#f16f84", labelX = Math.min(width - right - 120, Math.max(left + 5, x2 + 8)), labelY = Math.max(top + 20, Math.min(priceBottom - 10, y2 - 8)); return `<g class="measure-overlay"><rect x="${Math.min(x1,x2)}" y="${Math.min(y1,y2)}" width="${Math.abs(x2-x1)}" height="${Math.abs(y2-y1)}" fill="${color}"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}"/><circle cx="${x1}" cy="${y1}" r="4"/><circle cx="${x2}" cy="${y2}" r="4"/><rect class="measure-label-bg" x="${labelX}" y="${labelY - 16}" width="108" height="28" rx="6"/><text class="measure-label" x="${labelX + 8}" y="${labelY + 2}" fill="${color}">${change > 0 ? "+" : ""}${change.toFixed(2)}%</text></g>`; })() : "";
  const tradePlanOverlay = paperTradePlan && paperTradePlan.symbol === activeChartSymbol ? [
    [paperTradePlan.target, "TARGET", "#61dfae"], [paperTradePlan.entry, `${paperTradePlan.direction} ENTRY`, "#7da7ff"], [paperTradePlan.stop, "STOP", "#f06f83"],
  ].filter(([value]) => Number(value) >= min && Number(value) <= max).map(([value,label,color]) => `<g class="paper-level"><line x1="${left}" y1="${y(value)}" x2="${width-right}" y2="${y(value)}" stroke="${color}"/><rect x="${width-right-126}" y="${y(value)-10}" width="126" height="20" rx="5" fill="${color}"/><text x="${width-right-7}" y="${y(value)+4}" text-anchor="end">${label} · ${axisLabel(value)}</text></g>`).join("") : "";
  const dateOptions = activeChartRange === "15m" || activeChartRange === "4h" ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" } : { month: "short", day: "numeric" };
  const firstDate = new Date(bars[0].date).toLocaleString([], dateOptions), lastDate = new Date(bars.at(-1).date).toLocaleString([], dateOptions);
  const sessionBreakIndex = bars.findIndex((bar, index) => index > 0 && new Date(bar.date).toDateString() !== new Date(bars[index - 1].date).toDateString());
  const sessionBreak = sessionBreakIndex > 0 && (activeChartRange === "4h" || activeChartRange === "1d") ? (() => { const breakX = left + step * sessionBreakIndex; return `<g class="session-break"><line x1="${breakX}" y1="${top}" x2="${breakX}" y2="${priceBottom}"/><text x="${breakX + 6}" y="${top + 13}">NEW SESSION</text></g>`; })() : "";
  const lastPrice = Number(bars.at(-1).close), lastUp = lastPrice >= Number(bars.at(-1).open), lastY = y(lastPrice);
  const lastPriceTag = `<g class="last-price ${lastUp ? "up" : "down"}"><line x1="${left}" y1="${lastY}" x2="${width-right}" y2="${lastY}"/><rect x="${width-right}" y="${lastY-11}" width="${right}" height="22" rx="3"/><text x="${width-6}" y="${lastY+4}" text-anchor="end">${axisLabel(lastPrice)}</text></g>`;
  return `<svg class="candlestick-chart ${measureActive ? "is-measuring" : ""}" data-price-min="${min}" data-price-max="${max}" data-price-top="${top}" data-price-bottom="${priceBottom}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${safe(activeChartSymbol)} ${activeChartType} price chart"><g class="chart-grid">${grid}</g>${sessionBreak}${activeChartType === "candles" ? candles : lineChart}${studies}${fibonacci}${tradePlanOverlay}${measurementOverlay}${lastPriceTag}<text class="axis-date" x="${left}" y="${height - 5}">${safe(firstDate)}</text><text class="axis-date" text-anchor="end" x="${width - right}" y="${height - 5}">${safe(lastDate)}</text><text class="watermark" x="${width / 2}" y="${priceBottom / 2}">${safe(activeChartSymbol)}</text><g class="chart-crosshair" style="display:none"><line class="crosshair-x" x1="${left}" x2="${width-right}"/><line class="crosshair-y" y1="${top}" y2="${priceBottom}"/><circle r="4"/><g class="crosshair-price"><rect x="${width-right}" width="${right}" height="22" rx="3"/><text x="${width-6}" text-anchor="end"></text></g></g><rect class="chart-interaction-layer" x="${left}" y="${top}" width="${width-left-right}" height="${priceBottom-top}"/></svg>`;
}

function renderCurrentChart() {
  // A chart tool can be clicked while a new symbol or timeframe is still in
  // flight. Never repaint the previous symbol's candles under the new label.
  if (chartLoading) return;
  visibleChartBars = chartBarsInView();
  $("#main-chart").innerHTML = marketChartSvg(visibleChartBars);
  bindMeasureSurface();
  bindChartInspection();
  bindChartPan();
  bindChartZoom();
}

function renderInsufficientHistory(coverage) {
  currentChartBars = [];
  measurement = null;
  const firstDate = coverage?.firstAvailable ? new Date(coverage.firstAvailable).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : null;
  const suggestion = coverage?.suggestedRange;
  const suggestionLabel = suggestion ? ({ "15m": "15M", "4h": "4H", "1d": "1D", "1w": "1W", "1mo": "1M", "3mo": "3M", "1y": "1Y" }[suggestion] || suggestion) : null;
  const integrityFailure = currentTimeframeMeta?.integrity?.valid === false;
  const title = integrityFailure ? "Verified chart data unavailable" : "Not enough verified history";
  const detail = integrityFailure ? `${safe(activeChartSymbol)} returned an incomplete or irregular candle sequence for this view.` : `${safe(activeChartSymbol)} does not have enough candles to represent a complete ${safe(coverage?.requestedLabel || activeChartRange)} view.${firstDate ? ` First verified candle available: ${safe(firstDate)}.` : ""}`;
  $("#main-chart").innerHTML = `<div class="chart-history-empty"><span>${safe(currentTimeframeMeta?.label || activeChartRange)}</span><b>${title}</b><p>${detail}</p>${suggestion ? `<button type="button" data-suggested-range="${safe(suggestion)}">Open complete ${safe(suggestionLabel)} view</button>` : ""}<small>Unverified or partial candles are intentionally hidden instead of being presented as a valid chart.</small></div>`;
  $("#main-chart").querySelector("[data-suggested-range]")?.addEventListener("click", (event) => { activeChartRange = event.currentTarget.dataset.suggestedRange; loadMainChart(); });
}

function chartPointer(event, svg) { const rect = svg.getBoundingClientRect(), viewBox = svg.viewBox.baseVal; return { x: Math.max(58, Math.min(1048, (event.clientX - rect.left) * viewBox.width / rect.width)), y: Math.max(22, Math.min(278, (event.clientY - rect.top) * viewBox.height / rect.height)) }; }
function bindMeasureSurface() { const surface = $("#main-chart"); if (surface.dataset.measureBound) return; surface.dataset.measureBound = "true"; surface.addEventListener("pointerdown", (event) => { const svg = surface.querySelector("svg"); if (!measureActive || !svg) return; event.preventDefault(); const point = chartPointer(event, svg); measurement = { start: point, end: point }; surface.setPointerCapture?.(event.pointerId); renderCurrentChart(); }); surface.addEventListener("pointermove", (event) => { const svg = surface.querySelector("svg"); if (!measureActive || !measurement || !svg || event.buttons !== 1) return; measurement.end = chartPointer(event, svg); renderCurrentChart(); }); surface.addEventListener("pointerup", (event) => { const svg = surface.querySelector("svg"); if (!measureActive || !measurement || !svg) return; measurement.end = chartPointer(event, svg); renderCurrentChart(); }); }

function bindChartInspection() {
  const surface = $("#main-chart"), svg = surface.querySelector("svg"), layer = svg?.querySelector(".chart-interaction-layer"), crosshair = svg?.querySelector(".chart-crosshair");
  if (!svg || !layer || !crosshair || !visibleChartBars.length) return;
  const update = (event) => {
    if (measureActive && event.buttons === 1) return;
    const point = chartPointer(event, svg), index = Math.max(0, Math.min(visibleChartBars.length - 1, Math.floor((point.x - 58) / 990 * visibleChartBars.length))), bar = visibleChartBars[index];
    crosshair.style.display = "";
    crosshair.querySelector(".crosshair-x").setAttribute("y1", point.y); crosshair.querySelector(".crosshair-x").setAttribute("y2", point.y);
    crosshair.querySelector(".crosshair-y").setAttribute("x1", point.x); crosshair.querySelector(".crosshair-y").setAttribute("x2", point.x);
    crosshair.querySelector("circle").setAttribute("cx", point.x); crosshair.querySelector("circle").setAttribute("cy", point.y);
    const min = Number(svg.dataset.priceMin), max = Number(svg.dataset.priceMax), priceTop = Number(svg.dataset.priceTop), priceBottom = Number(svg.dataset.priceBottom);
    const cursorPrice = max - ((point.y - priceTop) / Math.max(1, priceBottom - priceTop)) * (max - min);
    const priceGroup = crosshair.querySelector(".crosshair-price"), priceText = priceGroup.querySelector("text");
    priceGroup.setAttribute("transform", `translate(0 ${point.y - 11})`);
    priceText.setAttribute("y", "15");
    priceText.textContent = Number.isFinite(cursorPrice) ? cursorPrice.toLocaleString("en-US", { minimumFractionDigits: cursorPrice >= 10 ? 2 : 4, maximumFractionDigits: cursorPrice >= 10 ? 2 : 4 }) : "—";
    const date = new Date(bar.date).toLocaleString([], activeChartRange === "15m" || activeChartRange === "4h" ? { month:"short",day:"numeric",hour:"2-digit",minute:"2-digit" } : { year:"numeric",month:"short",day:"numeric" });
    $("#chart-hover-readout").innerHTML = `<b>${safe(activeChartSymbol)} · ${safe(date)}</b><span>O ${Number(bar.open).toFixed(2)}</span><span>H ${Number(bar.high).toFixed(2)}</span><span>L ${Number(bar.low).toFixed(2)}</span><span>C ${Number(bar.close).toFixed(2)}</span><span>V ${Number(bar.volume || 0).toLocaleString("en-US", { maximumFractionDigits:0 })}</span>`;
  };
  layer.addEventListener("pointermove", update);
  layer.addEventListener("pointerleave", () => { crosshair.style.display = "none"; $("#chart-hover-readout").innerHTML = `<b>${safe(activeChartSymbol)}</b><span>Move over the chart for OHLCV</span>`; });
}

function bindChartPan() {
  const surface = $("#main-chart");
  if (surface.dataset.panBound) return;
  surface.dataset.panBound = "true";
  surface.addEventListener("pointerdown", (event) => {
    if (measureActive || !currentChartBars.length || event.button !== 0) return;
    const start = chartViewport?.start ?? 0, end = chartViewport?.end ?? currentChartBars.length;
    chartPan = { pointerId: event.pointerId, clientX: event.clientX, start, end };
    surface.classList.add("is-panning");
    surface.setPointerCapture?.(event.pointerId);
  });
  surface.addEventListener("pointermove", (event) => {
    if (!chartPan || chartPan.pointerId !== event.pointerId || measureActive) return;
    const visibleCount = chartPan.end - chartPan.start;
    if (visibleCount >= currentChartBars.length) return;
    const pixelsPerBar = Math.max(1, surface.clientWidth / visibleCount);
    const barDelta = Math.round((chartPan.clientX - event.clientX) / pixelsPerBar);
    const start = Math.max(0, Math.min(currentChartBars.length - visibleCount, chartPan.start + barDelta));
    chartViewport = { start, end: start + visibleCount };
    renderCurrentChart();
  });
  const finish = (event) => {
    if (!chartPan || (event.pointerId != null && chartPan.pointerId !== event.pointerId)) return;
    chartPan = null;
    surface.classList.remove("is-panning");
  };
  surface.addEventListener("pointerup", finish);
  surface.addEventListener("pointercancel", finish);
}

function bindChartZoom() {
  const surface = $("#main-chart");
  if (surface.dataset.zoomBound) return;
  surface.dataset.zoomBound = "true";
  surface.addEventListener("wheel", (event) => {
    if (!currentChartBars.length || measureActive) return;
    event.preventDefault();
    const rect = surface.getBoundingClientRect();
    const cursorRatio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1)));
    const oldStart = chartViewport?.start ?? 0, oldEnd = chartViewport?.end ?? currentChartBars.length;
    const oldCount = oldEnd - oldStart;
    const direction = event.deltaY < 0 ? .8 : 1.25;
    const newCount = Math.max(12, Math.min(currentChartBars.length, Math.round(oldCount * direction)));
    if (newCount === currentChartBars.length) chartViewport = null;
    else {
      const anchor = oldStart + oldCount * cursorRatio;
      let start = Math.round(anchor - newCount * cursorRatio);
      start = Math.max(0, Math.min(currentChartBars.length - newCount, start));
      chartViewport = { start, end: start + newCount };
    }
    renderCurrentChart();
  }, { passive: false });
}

function metricNumber(value, { percent = false, moneyValue = false, decimals = 1 } = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  if (moneyValue) return money.format(number);
  return `${number > 0 && percent ? "+" : ""}${number.toLocaleString("en-US", { maximumFractionDigits: decimals })}${percent ? "%" : ""}`;
}

function newsDirection(article) {
  const text = `${article.headline || ""} ${article.summary || ""}`.toLowerCase();
  const positive = (text.match(/beat|growth|raise|upgrade|record|surge|win|approval|expand|strong|bullish/g) || []).length;
  const negative = (text.match(/miss|cut|downgrade|lawsuit|probe|fraud|fall|decline|risk|weak|debt|selloff/g) || []).length;
  return positive > negative ? "bullish" : negative > positive ? "bearish" : "neutral";
}

function rankSymbolNews(items = []) {
  const nowSeconds = Date.now() / 1000, severity = /earnings|guidance|sec|investigation|acquisition|merger|offering|debt|rating|upgrade|downgrade|lawsuit|ceo|forecast|revenue|bitcoin/i;
  const normalized = items.map((item) => {
    const ageHours = Math.max(0, (nowSeconds - Number(item.datetime || 0)) / 3600), freshness = Math.max(0, 22 - Math.min(22, ageHours / 8));
    const severityPoints = severity.test(`${item.headline} ${item.summary}`) ? 32 : 10;
    const specificity = new Set((`${item.headline} ${item.summary}`.match(/\b[A-Z]{2,6}\b/g) || [])).size ? 8 : 4;
    return { ...item, score: Math.min(95, Math.round(24 + freshness + severityPoints + specificity)), direction: newsDirection(item) };
  }).sort((a,b) => b.score - a.score || Number(b.datetime) - Number(a.datetime));
  const seen = [];
  return normalized.filter((item) => { const words = String(item.headline || "").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter((word) => word.length > 4); const duplicate = seen.some((prior) => words.length && words.filter((word) => prior.includes(word)).length / words.length > .58); if (!duplicate) seen.push(words); return !duplicate; }).filter((item,index) => item.score >= 68 || index < 2).slice(0,4);
}

function whyNewsMatters(item) {
  const text = `${item.headline} ${item.summary}`.toLowerCase();
  if (/earnings|revenue|guidance|forecast/.test(text)) return "Changes the earnings path and valuation assumptions.";
  if (/debt|credit|offering|capital/.test(text)) return "Affects financing risk, dilution, and balance-sheet capacity.";
  if (/upgrade|downgrade|rating|target/.test(text)) return "Can reset institutional expectations and near-term positioning.";
  if (/sec|probe|lawsuit|investigation|fraud/.test(text)) return "Introduces regulatory or legal downside that the price may not fully reflect.";
  if (/bitcoin|crypto/.test(text)) return "Directly changes the company’s crypto-linked asset and risk exposure.";
  return "Relevant to the stock’s catalysts, risk, or market positioning.";
}

function renderStockResearch(data) {
  latestSymbolPayload = data;
  const detail = data.quote || {}, quote = detail.quote || {}, company = detail.company, fundamentals = detail.fundamentals || {}, signals = detail.snapshotSignals || {};
  if (!company?.name) {
    $("#brief-company").textContent = `${activeChartSymbol} market instrument`;
    $("#brief-context").textContent = "Company fundamentals are available for listed equities only.";
    $("#brief-verdict").textContent = "MARKET VIEW";
    $("#brief-thesis").innerHTML = "<p>This instrument keeps the live chart and positioning tools. Equity-only valuation and company news are intentionally not inferred.</p>";
    $("#brief-metrics").innerHTML = "";
    $("#symbol-news-list").innerHTML = '<p class="empty">Company-specific news is not available for this market instrument.</p>';
    return;
  }
  const valuation = fundamentals.valuation || {}, growth = fundamentals.growth || {}, quality = fundamentals.quality || {}, market = fundamentals.market || {}, recommendation = detail.recommendation || {}, sentiment = signals.sentiment || {}, insider = signals.insider || {}, shortFlow = signals.shortLongVolume?.available ? signals.shortLongVolume : data.positioning?.available ? { available:true, shortRatio:Number(data.positioning.shortVolume) / Number(data.positioning.totalVolume) } : null;
  let score = 50, components = 1;
  const add = (value) => { if (Number.isFinite(value)) { score += value; components += 1; } };
  add(valuation.targetUpsidePct == null ? NaN : Math.max(-15, Math.min(15, valuation.targetUpsidePct / 3)));
  add(growth.revenueGrowthYoy == null ? NaN : Math.max(-10, Math.min(10, growth.revenueGrowthYoy / 3)));
  add(quality.operatingMargin == null ? NaN : Math.max(-8, Math.min(8, quality.operatingMargin / 4)));
  add(sentiment.score == null ? NaN : (Number(sentiment.score) - 50) / 5);
  if (recommendation.counts) add((Number(recommendation.counts.buy) - Number(recommendation.counts.sell)) / Math.max(1, Number(recommendation.counts.buy) + Number(recommendation.counts.hold) + Number(recommendation.counts.sell)) * 12);
  score = Math.round(Math.max(0, Math.min(100, score)));
  const label = score >= 72 ? "CONSTRUCTIVE" : score <= 38 ? "DEFENSIVE" : "SELECTIVE";
  const positives = [];
  if (Number(valuation.targetUpsidePct) > 8) positives.push(`Analyst target implies ${metricNumber(valuation.targetUpsidePct,{percent:true})} upside`);
  if (Number(growth.revenueGrowthYoy) > 8) positives.push(`Revenue growth is ${metricNumber(growth.revenueGrowthYoy,{percent:true})}`);
  if (recommendation.counts?.buy > recommendation.counts?.sell) positives.push(`${recommendation.counts.buy} buy ratings vs ${recommendation.counts.sell} sell`);
  const risks = [];
  if (Number(market.beta) > 1.5) risks.push(`High beta (${metricNumber(market.beta,{decimals:2})})`);
  if (Number(quality.debtToEquity) > 100) risks.push(`Elevated debt/equity (${metricNumber(quality.debtToEquity,{percent:true})})`);
  if (Number(valuation.priceToSales) > 15) risks.push(`Demanding sales multiple (${metricNumber(valuation.priceToSales,{decimals:1})}×)`);
  $("#brief-company").textContent = `${company.name} · ${activeChartSymbol}`;
  $("#brief-context").textContent = `${company.industry || "Equity"} · ${company.exchange || "Listed market"} · ${components} verified scoring inputs`;
  $("#brief-verdict").textContent = `${label} ${score}/100`;
  $("#brief-verdict").className = `brief-verdict ${label.toLowerCase()}`;
  $("#brief-thesis").innerHTML = `<div><span>INVESTMENT CASE</span><b>${safe(positives[0] || recommendation.reason || "No single verified upside driver dominates.")}</b></div><div><span>KEY RISK</span><b>${safe(risks[0] || "No exceptional risk flag from the connected metrics.")}</b></div>`;
  const metrics = [
    ["MARKET CAP", quote.marketCap, "Company size", ""],
    ["VALUATION", valuation.forwardPe ?? valuation.peTtm, "Forward / trailing P/E", "×"],
    ["TARGET UPSIDE", valuation.targetUpsidePct, "Mean analyst target", "%"],
    ["REVENUE GROWTH", growth.revenueGrowthYoy, "Year over year", "%"],
    ["OPERATING MARGIN", quality.operatingMargin, "Business quality", "%"],
    ["VOLUME", quote.volumeActivity?.ratio, quote.volumeActivity?.state || "vs average", "×"],
    ["INSIDER · 12M", insider.available ? insider.buyCount : null, insider.available ? (insider.buyCount ? `Avg ${metricNumber(insider.averagePrice,{moneyValue:true})}` : "No open-market buys") : "Unavailable", ""],
    ["SHORT FLOW", shortFlow?.available ? Number(shortFlow.shortRatio) * 100 : null, "FINRA daily volume — not short interest", "%"],
  ];
  $("#brief-metrics").innerHTML = metrics.map(([name,value,caption,suffix]) => `<div><span>${safe(name)}</span><b>${value == null ? "—" : typeof value === "string" ? safe(value) : `${metricNumber(value,{percent:suffix==="%",decimals:suffix==="×"?2:1})}${suffix==="×"?"×":""}`}</b><small>${safe(caption)}</small></div>`).join("");
  $("#brief-source").textContent = fundamentals.source || "Finnhub live company data";
  const ranked = rankSymbolNews(detail.news || []);
  $("#news-context").textContent = ranked.length ? `${ranked.length} essential items · duplicates and low-impact headlines removed` : "No qualifying verified headline right now.";
  $("#symbol-news-list").innerHTML = ranked.length ? ranked.map((item) => `<a href="${safe(item.url)}" target="_blank" rel="noreferrer" class="news-item ${item.direction}"><div><span>${item.score}</span><small>${safe(item.direction.toUpperCase())}</small></div><section><b>${safe(item.headline)}</b><p>${safe(whyNewsMatters(item))}</p><small>${safe(item.source || "Verified company news")} · ${new Date(Number(item.datetime) * 1000).toLocaleString([], { month:"short",day:"numeric",hour:"2-digit",minute:"2-digit" })}</small></section></a>`).join("") : '<p class="empty">No high-priority verified company news is available right now.</p>';
}

async function loadMainChart() {
  const requestId = ++chartRequestId;
  const requestedSymbol = activeChartSymbol;
  const requestedRange = activeChartRange;
  chartLoading = true;
  currentChartBars = [];
  visibleChartBars = [];
  chartViewport = null;
  currentFibonacci = null;
  currentTimeframeMeta = null;
  currentChartPrice = null;
  latestSymbolPayload = null;
  $("#chart-symbol").textContent = requestedSymbol;
  $("#chart-price").textContent = "Loading…";
  $("#chart-change").className = "muted";
  $("#chart-change").textContent = "Connecting to verified candles…";
  $("#chart-data-source").className = "chart-data-source is-loading";
  $("#chart-data-source").textContent = "DATA SOURCE · CONNECTING";
  $("#chart-data-source").title = "Connecting to a verified market-data provider.";
  $("#chart-updated").textContent = `${CHART_RANGE_LABELS[requestedRange] || requestedRange.toUpperCase()} · loading ${requestedSymbol}`;
  $("#chart-hover-readout").innerHTML = `<b>${safe(requestedSymbol)}</b><span>Move over the chart for OHLCV</span>`;
  measurement = null;
  $("#main-chart").innerHTML = impactOneLoadingScene(requestedSymbol, "chart");
  document.querySelectorAll("#chart-ranges button").forEach((button) => {
    const isActiveRange = button.dataset.range === activeChartRange;
    button.classList.toggle("active", isActiveRange);
    button.setAttribute("aria-pressed", String(isActiveRange));
  });
  try {
    const providerSymbol = chartSymbolMap[requestedSymbol] || requestedSymbol;
    const response = await fetch(`/api/symbol/${encodeURIComponent(providerSymbol)}?range=${encodeURIComponent(requestedRange)}`), data = await response.json();
    if (requestId !== chartRequestId || requestedSymbol !== activeChartSymbol || requestedRange !== activeChartRange) return;
    if (!response.ok) throw new Error(data.error || "Chart unavailable");
    const quote = data.quote?.quote || {}, bars = data.chart || [], first = Number(bars[0]?.close), last = Number(bars.at(-1)?.close), rangeChange = Number.isFinite(first) && Number.isFinite(last) && first !== 0 ? ((last - first) / first) * 100 : Number(quote.changePercent ?? quote.change);
    renderStockResearch(data);
    currentChartBars = bars;
    currentFibonacci = fibonacciForSelectedRange(data.fibonacci, requestedRange, bars);
    if (fibonacciVisible && currentFibonacci) {
      const horizon = Math.max(2, Number(currentFibonacci.analysisBarCount || bars.length));
      if (horizon < bars.length) chartViewport = { start: bars.length - horizon, end: bars.length };
    }
    currentTimeframeMeta = data.timeframe || null;
    const chartSource = String(currentTimeframeMeta?.source || "").trim();
    const sourceNode = $("#chart-data-source");
    const isVerifiedFallback = currentTimeframeMeta?.sourceRole === "verified-fallback" || /impactone/i.test(chartSource);
    sourceNode.className = `chart-data-source ${chartSource ? (isVerifiedFallback ? "is-fallback" : "is-primary") : "is-error"}`;
    sourceNode.textContent = chartSource ? `${isVerifiedFallback ? "VERIFIED FALLBACK" : "DATA SOURCE"} · ${chartSource.toUpperCase()}` : "DATA SOURCE · UNAVAILABLE";
    sourceNode.title = chartSource
      ? (isVerifiedFallback ? "The primary feed was unavailable. These candles came from ImpactOne's verified fallback provider." : `These candles were supplied by ${chartSource}.`)
      : "No verified provider identified itself for this chart.";
    chartLoading = false;
    const coverage = currentTimeframeMeta?.coverage;
    const completeRange = coverage?.complete !== false;
    const liveQuotePrice = quote.price === null || quote.price === undefined ? NaN : Number(quote.price);
    currentChartPrice = Number.isFinite(liveQuotePrice) && liveQuotePrice > 0 ? liveQuotePrice : Number.isFinite(last) && last > 0 ? last : null;
    $("#chart-price").textContent = Number.isFinite(currentChartPrice) ? money.format(currentChartPrice) : "—";
    $("#chart-change").className = completeRange ? (rangeChange >= 0 ? "gain" : "loss") : "muted";
    $("#chart-change").textContent = completeRange && Number.isFinite(rangeChange) ? `${rangeChange > 0 ? "+" : ""}${rangeChange.toFixed(2)}% for range` : "Range unavailable";
    const fibonacciContext = fibonacciVisible && currentFibonacci
      ? ` · FIB: last ${Number(currentFibonacci.analysisBarCount || currentFibonacci.barCount)} ${currentTimeframeMeta?.candleLabel || "bars"} · ${Number(currentFibonacci.swingLow).toFixed(2)} low → ${Number(currentFibonacci.swingHigh).toFixed(2)} later high`
      : fibonacciVisible ? ` · FIB: no valid ${String(requestedRange).toUpperCase()} low → later high` : "";
    $("#chart-updated").textContent = `${currentTimeframeMeta?.label || activeChartRange} · ${bars.length} ${currentTimeframeMeta?.candleLabel || "bars"} · ${currentTimeframeMeta?.marketHours || "live session"}${fibonacciContext} · updated ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const positioning = data.positioning;
    if (positioning?.available && Number(positioning.totalVolume) > 0) { const shortPct = Number(positioning.shortVolume) / Number(positioning.totalVolume) * 100, otherPct = 100 - shortPct; const cot = positioning.kind === "cftc-cot"; $("#short-percent").textContent = `${shortPct.toFixed(1)}%`; $("#other-percent").textContent = `${otherPct.toFixed(1)}%`; $("#short-fill").style.width = `${shortPct}%`; $("#other-fill").style.width = `${otherPct}%`; $("#positioning-bar span").textContent = cot ? "NON-COMMERCIAL SHORT" : "SHORT VOLUME"; $("#positioning-bar > div:nth-child(3) span").textContent = cot ? "NON-COMMERCIAL LONG" : "OTHER REPORTED VOLUME"; $("#positioning-source").textContent = cot ? `${positioning.market} · CFTC weekly report ${positioning.reportDate || ""} · ${positioning.signal}.` : `${positioning.sessions} FINRA sessions · short volume is not short interest or trader count.`; $("#positioning-bar").classList.remove("unavailable"); } else { $("#short-percent").textContent = "—"; $("#other-percent").textContent = "—"; $("#short-fill").style.width = "0%"; $("#other-fill").style.width = "0%"; $("#positioning-bar span").textContent = "SHORT VOLUME"; $("#positioning-bar > div:nth-child(3) span").textContent = "OTHER REPORTED VOLUME"; $("#positioning-source").textContent = "Verified positioning is unavailable for this instrument."; $("#positioning-bar").classList.add("unavailable"); }
    if (!completeRange) renderInsufficientHistory(coverage);
    else renderCurrentChart();
  } catch (error) {
    if (requestId === chartRequestId) {
      chartLoading = false;
      $("#chart-data-source").className = "chart-data-source is-error";
      $("#chart-data-source").textContent = "DATA SOURCE · UNAVAILABLE";
      $("#chart-data-source").title = "No verified chart source is currently available.";
      $("#main-chart").innerHTML = `<div class="symbol-error"><b>Chart unavailable</b><p>${safe(error.message)}</p></div>`;
    }
  }
}

function updatePaperRisk() {
  const entry = Number(currentChartPrice), quantity = Number($("#paper-quantity").value), stop = Number($("#paper-stop").value), target = Number($("#paper-target").value);
  const riskPerShare = paperDirection === "LONG" ? entry - stop : stop - entry;
  const rewardPerShare = paperDirection === "LONG" ? target - entry : entry - target;
  $("#paper-notional").textContent = Number.isFinite(entry * quantity) ? money.format(entry * quantity) : "—";
  $("#paper-risk").textContent = riskPerShare > 0 && quantity > 0 ? money.format(riskPerShare * quantity) : "—";
  $("#paper-reward").textContent = rewardPerShare > 0 && quantity > 0 ? money.format(rewardPerShare * quantity) : "—";
  $("#paper-rr").textContent = riskPerShare > 0 && rewardPerShare > 0 ? `1 : ${(rewardPerShare / riskPerShare).toFixed(2)}` : "—";
}
function openPaperDialog(direction) {
  paperDirection = direction; const entry = Number(currentChartPrice);
  if (!Number.isFinite(entry) || entry <= 0) { $("#main-chart").insertAdjacentHTML("afterbegin", '<div class="chart-trade-warning">A verified entry price is required before opening a paper position.</div>'); return; }
  $("#paper-position-dialog").classList.toggle("is-short", direction === "SHORT"); $("#paper-position-dialog").classList.toggle("is-long", direction === "LONG");
  $("#paper-direction-orb").textContent = direction === "LONG" ? "↗" : "↘"; $("#paper-direction-title").textContent = direction === "LONG" ? "Long" : "Short"; $("#paper-symbol").textContent = activeChartSymbol; $("#paper-entry").textContent = Number.isFinite(entry) ? money.format(entry) : "—";
  $("#paper-stop").value = Number.isFinite(entry) ? (direction === "LONG" ? entry * .97 : entry * 1.03).toFixed(2) : ""; $("#paper-target").value = Number.isFinite(entry) ? (direction === "LONG" ? entry * 1.06 : entry * .94).toFixed(2) : ""; $("#paper-position-error").textContent = ""; updatePaperRisk(); $("#paper-position-dialog").showModal();
}
async function submitPaperPosition(event) {
  event.preventDefault(); const entry = Number(currentChartPrice), quantity = Number($("#paper-quantity").value), stop = Number($("#paper-stop").value), target = Number($("#paper-target").value); const invalidRisk = paperDirection === "LONG" ? !(stop < entry && target > entry) : !(stop > entry && target < entry);
  if (!Number.isFinite(entry) || invalidRisk) { $("#paper-position-error").textContent = paperDirection === "LONG" ? "Long requires Stop below entry and Target above entry." : "Short requires Stop above entry and Target below entry."; return; }
  const button = $("#paper-position-submit"); button.disabled = true; button.textContent = "Opening…";
  try { const response = await fetch("/api/paper-position", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ symbol:activeChartSymbol, direction:paperDirection, quantity, sector:"General", assetType:"Equity" }) }); const result=await response.json(); if(!response.ok) throw new Error(result.error || "Paper position failed"); paperTradePlan={symbol:activeChartSymbol,direction:paperDirection,entry:Number(result.trade?.price || entry),stop,target,quantity}; $("#paper-position-dialog").close(); renderCurrentChart(); await loadDashboard(); document.querySelector("#portfolio")?.scrollIntoView({behavior:"smooth",block:"start"}); }
  catch(error){ $("#paper-position-error").textContent=error.message; } finally { button.disabled=false; button.textContent="Open paper position"; }
}

function chartSvg(bars) {
  if (!bars.length) return '<div class="chart-empty">No chart history available.</div>';
  const width = 760, height = 230, pad = 18, closes = bars.map((bar) => Number(bar.close)), low = Math.min(...closes), high = Math.max(...closes), spread = high - low || 1;
  const points = closes.map((value, index) => `${pad + (index / Math.max(1, closes.length - 1)) * (width - pad * 2)},${height - pad - ((value - low) / spread) * (height - pad * 2)}`).join(" ");
  const linePath = points.split(" ").map((point, index) => `${index ? "L" : "M"}${point}`).join(" ");
  return `<svg class="price-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Price chart"><defs><linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f72ff" stop-opacity=".42"/><stop offset="1" stop-color="#6f72ff" stop-opacity="0"/></linearGradient></defs><path d="${linePath} L${width - pad},${height - pad} L${pad},${height - pad} Z" fill="url(#chart-area)"/><path d="${linePath}" fill="none" stroke="#8d8fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function symbolMetricOrbs(data) {
  const detail = data.quote || {}, quote = detail.quote || {}, fundamentals = detail.fundamentals || {};
  const signals = detail.snapshotSignals || {}, valuation = fundamentals.valuation || {}, sentiment = signals.sentiment || {};
  const agentRaw = (id) => data.intelligence?.agents?.find((agent) => agent.agentId === id)?.result?.raw || null;
  const valuationAgent = agentRaw("valuation"), optionsAgent = agentRaw("options");
  const shortFlow = signals.shortLongVolume?.available ? signals.shortLongVolume : null;
  const shortPct = shortFlow ? Number(shortFlow.shortRatio) * 100 : null;
  const longPct = Number.isFinite(shortPct) ? 100 - shortPct : null;
  const insider = signals.insider || {}, fib = data.fibonacci || {};
  const fib886 = Array.isArray(fib.levels) ? fib.levels.find((level) => Number(level.ratio) === 0.886) : null;
  const pe = valuationAgent?.valuationExplanation?.trailingPe ?? valuation.forwardPe ?? valuation.peTtm ?? quote.pe;
  const optionContext = optionsAgent?.inputs?.historicalContext || {}, optionVolume = optionsAgent?.inputs?.optionVolume || {};
  const optionMultiple = Number(optionContext.volumeVsAverage);
  const optionCallShare = Number(optionsAgent?.signals?.callAccumulation?.share);
  const items = [
    { label:"P/E", value:Number.isFinite(Number(pe)) ? `${Number(pe).toFixed(1)}×` : "—", detail:Number.isFinite(Number(valuationAgent?.valuationExplanation?.priceFitScore)) ? `${valuationAgent.valuationExplanation.priceFitScore}/10 vs sector` : "Price per $1 earned", tone:"violet", source:valuationAgent?.dataQuality?.peerSourceProvider || fundamentals.source },
    { label:"SHORT", value:Number.isFinite(shortPct) ? `${shortPct.toFixed(1)}%` : "—", detail:"FINRA daily flow", tone:"red", source:shortFlow?.source || data.positioning?.source },
    { label:"LONG", value:Number.isFinite(longPct) ? `${longPct.toFixed(1)}%` : "—", detail:"Other reported volume", tone:"green", source:shortFlow?.source || data.positioning?.source },
    { label:"INSIDERS", value:insider.available ? String(Number(insider.buyCount || 0)) : "—", detail:insider.available ? (insider.buyCount ? `Avg ${metricNumber(insider.averagePrice,{moneyValue:true})}` : "No verified buys") : "No verified data", tone:"amber", source:"SEC Form 4 / Finnhub" },
    { label:"NEWS", value:sentiment.available ? `${Number(sentiment.newsScore || 0).toFixed(1)}/10` : "—", detail:sentiment.available ? `${Number(sentiment.articleCount || 0)} articles` : "No verified score", tone:"blue", source:"Live symbol news" },
    { label:"SENTIMENT", value:sentiment.available ? String(sentiment.state || "—") : "—", detail:sentiment.available ? `${Number(sentiment.score || 0).toFixed(0)}/100` : "Unavailable", tone:"cyan", source:"News sentiment agent" },
    { label:"VOLUME", value:quote.volumeActivity?.available ? `${Number(quote.volumeActivity.ratio || 0).toFixed(2)}×` : safe(quote.volume || "—"), detail:quote.volumeActivity?.state || "vs average", tone:"teal", source:"Live quote" },
    { label:"OPTIONS EOD", value:Number.isFinite(optionMultiple) ? `${optionMultiple.toFixed(2)}×` : (Number(optionVolume.total) ? Number(optionVolume.total).toLocaleString() : "—"), detail:Number.isFinite(optionCallShare) ? `${Math.round(optionCallShare * 100)}% calls · ${100 - Math.round(optionCallShare * 100)}% puts` : "No verified baseline", tone:"violet", source:optionsAgent?.dataQuality?.source ? `${optionsAgent.dataQuality.source} · ${optionsAgent.inputs?.reportDate || "date unavailable"} · end of day` : "Source unavailable" },
    { label:"FIB 0.886", value:fib886 ? money.format(Number(fib886.price)) : "—", detail:fib886 ? `${safe(data.timeframe?.label || activeChartRange.toUpperCase())} low → later high` : "No valid setup", tone:"gold", source:fib886 ? `${safe(data.timeframe?.candleLabel || "Selected candles")} · ${safe(data.timeframe?.source || "verified source")}` : "Unavailable" },
  ];
  return `<section class="symbol-orbit-section"><header><div><p class="card-title">VERIFIED MARKET LENSES</p><h3>Key facts at a glance</h3></div><small>Hover or focus an orb to see its source</small></header><div class="symbol-orbit-grid">${items.map((item) => `<div class="symbol-data-orb tone-${item.tone}" tabindex="0" title="${safe(item.source || "Verified source unavailable")}"><span>${safe(item.label)}</span><b>${safe(item.value)}</b><small>${safe(item.detail)}</small><em>${safe(item.source || "Source unavailable")}</em></div>`).join("")}</div></section>`;
}

function symbolPriceEarnings(data) {
  const view = data.intelligence?.decisionSynthesis?.priceAndEarnings;
  if (!view) return "";
  const valuationAgent = data.intelligence?.agents?.find((agent) => agent.agentId === "valuation")?.result?.raw;
  const gap = Number(view.valuation?.priceGapPct);
  const gapText = Number.isFinite(gap) ? `${gap > 0 ? "+" : ""}${gap.toFixed(1)}%` : "—";
  const peerLabel = valuationAgent?.dataQuality?.peerGroupSize ? `${valuationAgent.dataQuality.peerGroupSize} sector peers · ${valuationAgent.dataQuality.peerSourceAsOf || "date unavailable"}` : "sector benchmark unavailable";
  return `<section class="symbol-price-fit ${view.complete ? "is-complete" : "is-limited"}"><div><p class="card-title">PRICE × BUSINESS</p><h3>${safe(String(view.assessment || "INSUFFICIENT_DATA").replaceAll("_", " "))}</h3><p>${safe(view.plainLanguage)}</p></div><dl><div><dt>Fair-value gap</dt><dd>${gapText}</dd></div><div><dt>Sector check</dt><dd>${safe(peerLabel)}</dd></div><div><dt>Earnings</dt><dd>${safe(view.earnings?.health || "UNKNOWN")}</dd></div><div><dt>Outlook</dt><dd>${safe(view.earnings?.outlook || "UNKNOWN")}</dd></div><div><dt>Confidence</dt><dd>${Number.isFinite(Number(view.valuation?.confidence)) ? `${Number(view.valuation.confidence)}/100` : "—"}</dd></div></dl><small>Valuation: ${safe(valuationAgent?.dataQuality?.peerSourceProvider || view.valuation?.source || "unavailable")} · Earnings: ${safe(view.earnings?.source || "unavailable")}</small></section>`;
}

function symbolContrarianRegime(data) {
  const view = data.intelligence?.decisionSynthesis?.contrarianRegime;
  if (!view) return "";
  return `<section class="symbol-price-fit symbol-contrarian ${view.actionable ? "is-watch" : "is-limited"}"><div><p class="card-title">CROWD EXTREMES · MARKET-WIDE</p><h3>${safe(String(view.state || "NO_CONTRARIAN_SIGNAL").replaceAll("_", " "))}</h3><p>${safe(view.plainLanguage)}</p></div><dl><div><dt>Sentiment</dt><dd>${Number.isFinite(Number(view.inputs?.sentimentScore)) ? `${Number(view.inputs.sentimentScore)}/100` : "—"}</dd></div><div><dt>Liquidity</dt><dd>${Number.isFinite(Number(view.inputs?.liquidityScore)) ? `${Number(view.inputs.liquidityScore)}/100` : "—"}</dd></div><div><dt>Daily trend</dt><dd>${safe(view.inputs?.dailyTrend || "UNKNOWN")}</dd></div><div><dt>Use</dt><dd>WATCH ONLY</dd></div></dl><small>${safe(view.blockers?.length ? `Waiting for: ${view.blockers.join(" · ")}` : "All required confirmations are present.")}</small></section>`;
}

function symbolAgentOrbs(data) {
  const agents = Array.isArray(data.intelligence?.agents) ? data.intelligence.agents : [];
  const summary = data.intelligence?.summary || {};
  const tone = (agent) => agent.status !== "fulfilled" ? "muted" : /bull|positive|undervalued|support/i.test(agent.direction || "") ? "green" : /bear|negative|overvalued|resist/i.test(agent.direction || "") ? "red" : "blue";
  return `<section class="symbol-orbit-section symbol-agent-section"><header><div><p class="card-title">AGENT NETWORK</p><h3>${Number(summary.fulfilled || 0)}/${Number(summary.total || agents.length)} agents reporting</h3></div><small>Real result, confidence and availability from every registered agent</small></header><div class="symbol-agent-orbits">${agents.map((agent) => {
    const available = agent.status === "fulfilled";
    const confidence = available ? Math.max(0, Math.min(100, Number(agent.confidence || 0))) : 0;
    const resultSummary = agent.result?.summary || agent.error || (available ? "Verified result available" : "No verified data source");
    return `<article class="symbol-agent-orb tone-${tone(agent)} ${available ? "is-live" : "is-unavailable"}" style="--agent-score:${confidence}%" tabindex="0"><div><span>${safe(String(agent.agentName || agent.agentId).replace(/ Intelligence Agent| Agent/g,""))}</span><b>${available ? confidence : "—"}</b><small>${safe(available ? (agent.direction || "NEUTRAL") : "UNAVAILABLE")}</small></div><p>${safe(resultSummary)}</p><em>${safe(available ? `${agent.evidence?.length || 0} evidence items` : agent.error || "Not connected")}</em></article>`;
  }).join("")}</div></section>`;
}

async function openSymbol(symbol) {
  const normalized = String(symbol || "").trim().toUpperCase().replace(/[^A-Z0-9.\-]/g, "");
  if (!normalized || normalized === "MARKET") return;
  const dialog = $("#symbol-dialog");
  $("#symbol-content").innerHTML = impactOneLoadingScene(normalized, "intelligence");
  dialog.showModal();
  try {
    const response = await fetch(`/api/symbol/${encodeURIComponent(normalized)}?range=1mo`), data = await response.json();
    if (!response.ok) throw new Error(data.error || "Symbol data unavailable");
    const quote = data.quote?.quote || {}, recommendation = data.recommendations?.[0], change = Number(quote.changePercent ?? quote.change);
    $("#symbol-content").innerHTML = `<header class="symbol-header"><div><p class="card-title">LIVE SYMBOL INTELLIGENCE</p><h2>${safe(data.symbol)} <small>${safe(data.quote?.company?.name || "")}</small></h2><p class="symbol-source-line">Updated ${new Date(data.updatedAt).toLocaleString()} · ${safe(data.timeframe?.source || "Source unavailable")}</p></div><div><b>${Number.isFinite(Number(quote.price)) ? money.format(quote.price) : "—"}</b><span class="${change >= 0 ? "gain" : "loss"}">${Number.isFinite(change) ? `${change > 0 ? "+" : ""}${change.toFixed(2)}%` : "—"}</span></div></header>${chartSvg(data.chart || [])}${symbolPriceEarnings(data)}${symbolContrarianRegime(data)}${symbolMetricOrbs(data)}${symbolAgentOrbs(data)}<div class="symbol-verdict"><span>${safe(recommendation?.action || data.quote?.recommendation?.label || "MONITOR")}</span><p>${safe(recommendation?.reasoning || data.quote?.recommendation?.reason || "No active recommendation is available for this symbol.")}</p></div>`;
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

async function loadStrategyLab() {
  const summary = $("#strategy-lab-summary");
  try {
    const response = await fetch("/api/strategy-lab");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Strategy Lab unavailable");
    const p = data.portfolio || {};
    const updatedAt = p.updatedAt ? new Date(p.updatedAt) : null;
    summary.innerHTML = [["Demo capital", `$${Number(p.totalValue || 0).toLocaleString()}`], ["Open trades", p.positions?.length || 0], ["Weekly watchlist", (data.plans || []).filter((x) => x.status === "ACTIVE").length], ["Total return", `${Number(p.totalReturnPct || 0).toFixed(2)}%`]].map(([label,value]) => `<div><small>${safe(label)}</small><b>${safe(value)}</b></div>`).join("") + `<div class="strategy-lab__freshness"><span aria-hidden="true"></span><small>Paper data</small><b>${updatedAt && !Number.isNaN(updatedAt.getTime()) ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Update time unavailable"}</b></div>`;
    $("#strategy-lab-plans").innerHTML = (data.plans || []).filter((plan) => plan.status === "ACTIVE").slice(0,8).map((plan) => {
      const reached = Boolean(plan.armedAt);
      const weeklyLive = Number.isFinite(Number(plan.lastWeeklyCheck?.currentPrice)) && Number(plan.lastWeeklyCheck.currentPrice) > 0;
      const status = reached ? "ENTRY ZONE" : weeklyLive ? "LIVE WATCH" : "TARGET SAVED";
      return `<button type="button" class="${reached ? "is-armed" : "is-watching"}" data-strategy-symbol="${safe(plan.symbol)}" aria-label="Open ${safe(plan.symbol)} weekly strategy chart"><header><b>${symbolLogo(plan.symbol, "small")}<span>${safe(plan.symbol)}</span></b><em>${status}</em></header><span class="strategy-lab__tranches" aria-label="${safe(plan.tranches.filter((t) => t.status === "FILLED").length)} of ${safe(plan.tranches.length)} entries filled">${plan.tranches.map((t, index) => `<i class="${t.status === "FILLED" ? "filled" : ""}" title="Entry ${index + 1}: ${safe(t.offsetPct)}% · $${safe(t.triggerPrice)}"></i>`).join("")}</span><footer><span><small>Weekly 0.886 target</small><em>${weeklyLive ? `Live $${safe(Number(plan.lastWeeklyCheck.currentPrice).toFixed(2))}` : "Weekly feed unavailable"}</em></span><strong>$${safe(Number(plan.targetPrice).toFixed(2))}</strong></footer></button>`;
    }).join("");
    $("#strategy-lab-report").textContent = data.latestWeeklyReport?.simpleSummary || "No weekly report yet.";
    document.querySelectorAll("[data-strategy-symbol]").forEach((button) => button.addEventListener("click", () => openChartWorkspace(button.dataset.strategySymbol)));
  } catch (error) { summary.innerHTML = `<div class="strategy-lab__connection error"><span aria-hidden="true">⌁</span><div><b>Demo portfolio is offline</b><small>The strategy and candidates are safe. Reconnect the local data service to resume the simulation.</small></div></div>`; }
}

async function loadDashboard() {
  $("#refresh-button").classList.add("spinning");
  try { const response = await fetch("/api/dashboard"); if (!response.ok) throw new Error("Dashboard unavailable"); renderDashboard(await response.json()); }
  catch { $("#source-status").textContent = "ImpactOne backend is unavailable. Start it and refresh."; }
  finally { $("#refresh-button").classList.remove("spinning"); }
}

const SOURCE_LABELS = { marketData: ["Market prices", "Finnhub + verified fallback"], chart: ["Chart candles", "ImpactOne chart providers"], news: ["Market news", "NewsAPI + public feeds"], ai: ["AI summaries", "OpenAI or structured fallback"], notifications: ["Alerts", "ImpactOne database"], decisionCenter: ["Agent decisions", "Agent committee"], impactGraph: ["Impact graph", "World memory"], identity: ["User profile", "Identity store"] };

async function loadSourceStatus() {
  const content = $("#source-status-content");
  content.innerHTML = '<div class="insider-loading"><i></i><span>Checking live sources…</span></div>';
  try {
    const response = await fetch("/api/source-status");
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Source status unavailable");
    content.innerHTML = Object.entries(SOURCE_LABELS).map(([key, [label, source]]) => {
      const item = payload.modules?.[key];
      if (!item) return "";
      const state = item.status === "HEALTHY" ? "is-live" : item.status === "WARNING" ? "is-delayed" : "is-offline";
      return `<article class="source-status-item ${state}"><header><i></i><b>${safe(label)}</b><strong>${safe(item.status)}</strong></header><p>${safe(source)}</p><small>${safe(item.detail)}</small><footer><span>Health check</span><b>${safe(item.latencyMs)} ms</b></footer></article>`;
    }).join("");
    $("#source-status-time").textContent = `Checked ${new Date(payload.generatedAt).toLocaleString()}`;
  } catch (error) {
    content.innerHTML = `<div class="source-status-error"><b>Source check unavailable</b><span>${safe(error.message)}</span></div>`;
  }
}

function openSourceStatus() {
  $("#source-status-dialog").showModal();
  loadSourceStatus();
}

$("#symbol-search").addEventListener("submit", (event) => { event.preventDefault(); openSymbol($("#search").value); });
$("#assistant-button").addEventListener("click", openAssistant); $("#analysis-button").addEventListener("click", openAssistant);
$("#scanner-button").addEventListener("click", () => { $("#search").focus(); $("#search").placeholder = "Enter a symbol for live multi-agent analysis…"; window.scrollTo({ top: 0, behavior: "smooth" }); });
$("#refresh-button").addEventListener("click", loadDashboard);
$("#source-status-button").addEventListener("click", openSourceStatus);
$("#source-status-refresh").addEventListener("click", loadSourceStatus);
$("#source-status-close").addEventListener("click", () => $("#source-status-dialog").close());
$("#source-status-dialog").addEventListener("click", (event) => { if (event.target === $("#source-status-dialog")) $("#source-status-dialog").close(); });
$("#insider-refresh").addEventListener("click", () => loadInsiderOpportunities(true));
$("#weekly-fib-refresh").addEventListener("click", () => loadWeeklyFibonacciOpportunities(true));
$("#daily-agent-picks-refresh").addEventListener("click", () => loadDailyAgentPicks(true));
$("#market-customize").addEventListener("click", openMarketEditor);
$("#market-editor-close").addEventListener("click", () => $("#market-editor").close());
$("#market-editor").addEventListener("click", (event) => { if (event.target === $("#market-editor")) $("#market-editor").close(); });
$("#market-editor-reset").addEventListener("click", () => { draftMarketSymbols = [...DEFAULT_MARKET_ORDER]; renderMarketEditor(); });
$("#market-editor-save").addEventListener("click", () => { if (draftMarketSymbols.length < 3) { $("#market-editor-error").textContent = "Choose at least three assets for your ribbon."; return; } selectedMarketSymbols = [...draftMarketSymbols]; localStorage.setItem(MARKET_PREFS_KEY, JSON.stringify(selectedMarketSymbols)); $("#market-editor").close(); renderDashboard(dashboardData); });
$("#strategy-watchlist-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#strategy-watchlist-symbol"), message = $("#strategy-watchlist-message"), button = event.currentTarget.querySelector("button");
  const symbol = input.value.trim().toUpperCase();
  if (!symbol) { message.textContent = "Enter a ticker symbol first."; return; }
  button.disabled = true; button.textContent = "Verifying weekly data…"; message.textContent = "Calculating the verified weekly low → high structure and 0.886 entry zone.";
  try {
    const response = await fetch("/api/strategy-watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "The stock could not be added.");
    input.value = "";
    message.textContent = payload.dataAvailable ? `${payload.symbol} is now monitored automatically around ${money.format(payload.targetPrice)}.` : `${payload.symbol} was saved, but no alert will be armed until enough verified weekly data exists.`;
    await loadStrategyWatchlist();
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = "＋ Start monitoring"; }
});
$("#strategy-watchlist-refresh").addEventListener("click", () => loadStrategyWatchlist(true));
$("#dialog-close").addEventListener("click", () => $("#symbol-dialog").close());
$("#symbol-dialog").addEventListener("click", (event) => { if (event.target === $("#symbol-dialog")) $("#symbol-dialog").close(); });
$("#assistant-close").addEventListener("click", () => $("#assistant-dialog").close());
$("#assistant-dialog").addEventListener("click", (event) => { if (event.target === $("#assistant-dialog")) $("#assistant-dialog").close(); });
$("#assistant-form").addEventListener("submit", askAssistant);
document.querySelectorAll(".sidebar nav a").forEach((link) => link.addEventListener("click", () => { document.querySelectorAll(".sidebar nav a").forEach((item) => item.classList.remove("active")); link.classList.add("active"); }));
updateClock(); setInterval(updateClock, 1000); loadTradingViewSignals(); loadDashboard(); loadStrategyWatchlist(); loadDailyAgentPicks(); loadInsiderOpportunities(); loadWeeklyFibonacciOpportunities(); loadStrategyLab(); setInterval(loadDashboard, 60000); setInterval(loadStrategyWatchlist, 5 * 60 * 1000); setInterval(loadTradingViewSignals, 60000); setInterval(loadStrategyLab, 60000);
document.addEventListener("keydown", (event) => { if (event.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { event.preventDefault(); $("#search").focus(); } });
function setFibonacciVisible(visible) {
  fibonacciVisible = Boolean(visible);
  $("#fibonacci-toggle").classList.toggle("active", fibonacciVisible);
  $("#fibonacci-toggle").setAttribute("aria-pressed", String(fibonacciVisible));
  $("#fibonacci-toggle").title = "ImpactOne strategy: selected-timeframe low to a later high";
}

document.querySelectorAll("#chart-ranges button").forEach((button) => button.addEventListener("click", () => {
  activeChartRange = button.dataset.range;
  loadMainChart();
}));
$("#chart-search").addEventListener("submit", (event) => { event.preventDefault(); const value = $("#chart-search-input").value.trim().toUpperCase(); if (!value) return; const aliases = { DXY: "DXY", BTC: "BTC", GOLD: "GOLD", NQ: "NQ", ES: "ES", US10Y: "US10Y", VIX: "VIX" }; activeChartSymbol = aliases[value] || value; loadMainChart(); });
$("#chart-type").addEventListener("change", (event) => { activeChartType = event.target.value; renderCurrentChart(); });
$("#study-menu-button").addEventListener("click", () => { const menu = $("#study-menu"), open = menu.hidden; menu.hidden = !open; $("#study-menu-button").setAttribute("aria-expanded", String(open)); });
document.querySelectorAll("[data-study]").forEach((input) => input.addEventListener("change", () => { if (input.checked) activeStudies.add(input.dataset.study); else activeStudies.delete(input.dataset.study); renderCurrentChart(); }));
document.addEventListener("click", (event) => { if (!event.target.closest(".study-menu")) { $("#study-menu").hidden = true; $("#study-menu-button").setAttribute("aria-expanded", "false"); } });
$("#measure-tool").addEventListener("click", () => { measureActive = !measureActive; if (!measureActive) measurement = null; $("#measure-tool").classList.toggle("active", measureActive); $("#measure-tool").setAttribute("aria-pressed", String(measureActive)); $("#measure-tool").textContent = measureActive ? "× Clear measure" : "↗ Measure %"; renderCurrentChart(); });
$("#fibonacci-toggle").addEventListener("click", () => {
  setFibonacciVisible(!fibonacciVisible);
  if (fibonacciVisible && currentFibonacci) {
    const horizon = Math.max(2, Number(currentFibonacci.analysisBarCount || currentChartBars.length));
    if (horizon < currentChartBars.length) chartViewport = { start: currentChartBars.length - horizon, end: currentChartBars.length };
  }
  renderCurrentChart();
});
$("#chart-autofit").addEventListener("click", () => { measurement = null; chartViewport = null; renderCurrentChart(); });
document.querySelectorAll("[data-paper-direction]").forEach((button) => button.addEventListener("click", () => openPaperDialog(button.dataset.paperDirection)));
$("#paper-position-close").addEventListener("click", () => $("#paper-position-dialog").close());
$("#paper-position-dialog").addEventListener("click", (event) => { if (event.target === $("#paper-position-dialog")) $("#paper-position-dialog").close(); });
$("#paper-position-form").addEventListener("input", updatePaperRisk);
$("#paper-position-form").addEventListener("submit", submitPaperPosition);
$("#paper-portfolio-link").addEventListener("click", () => $("#paper-position-dialog").close());
$("#chart-fullscreen").addEventListener("click", () => { const panel = $("#live-chart"), expanded = panel.classList.toggle("chart-expanded"); document.body.classList.toggle("chart-mode-open", expanded); $("#chart-fullscreen").textContent = expanded ? "× Exit full screen" : "⛶ Full screen"; });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && $("#live-chart").classList.contains("chart-expanded")) $("#chart-fullscreen").click(); });
$("#brief-open-analysis").addEventListener("click", () => { if (latestSymbolPayload?.quote?.company?.name) openSymbol(activeChartSymbol); });
loadMainChart();

const WORKSPACE_VIEWS = {
  mission: {
    eyebrow: "LIVE SYSTEM VIEW",
    title: "Mission Control",
    description: "Your verified market picture, priorities and daily agent signals in one command view.",
    mark: "◈",
    selectors: [".intro", ".integration-status-row", "#tradingview-signal-strip", ".market-deck", ".dashboard-stage", ".decision-rail", ".action-row", "#daily-agent-picks"]
  },
  portfolio: {
    eyebrow: "CAPITAL & RISK",
    title: "Capital Deck",
    description: "Paper trades, weekly entry zones and risk—one clear view.",
    mark: "▣",
    selectors: ["#strategy-lab", "#portfolio"]
  },
  news: {
    eyebrow: "VERIFIED CATALYSTS",
    title: "Signal Wire",
    description: "Verified catalysts and unusual insider activity, ranked by impact.",
    mark: "◉",
    selectors: [".decision-rail", "#insider-opportunities"]
  },
  market: {
    eyebrow: "MARKETS & STRATEGY",
    title: "Market Lab",
    description: "Live markets and verified weekly 0.886 setups—without chart clutter.",
    mark: "⌁",
    selectors: [".market-deck", "#weekly-fibonacci-opportunities"]
  },
  chart: {
    eyebrow: "ADVANCED CHART",
    title: "Chart Studio",
    description: "A dedicated workspace for price action, timeframe-aware Fibonacci, indicators and paper trades.",
    mark: "╱╲",
    selectors: ["#live-chart"]
  },
  watchlist: {
    eyebrow: "YOUR TRACKED NAMES",
    title: "Watchlist",
    description: "A clean view of the symbols you follow, with direct access to their live intelligence.",
    mark: "☆",
    selectors: ["#portfolio"]
  },
  ai: {
    eyebrow: "AGENT COMMITTEE",
    title: "Agent Council",
    description: "Daily picks, evidence checks and committee decisions.",
    mark: "✦",
    selectors: ["#daily-agent-picks", "#recommendations"]
  }
};

const WORKSPACE_MANAGED_SELECTORS = [...new Set(Object.values(WORKSPACE_VIEWS).flatMap((view) => view.selectors))];

function workspaceHeading() {
  let heading = document.querySelector(".workspace-view-heading");
  if (heading) return heading;
  heading = document.createElement("section");
  heading.className = "workspace-view-heading";
  heading.innerHTML = '<div><p class="workspace-view-heading__eyebrow"></p><h1></h1><p></p></div><span class="workspace-view-heading__mark" aria-hidden="true"></span>';
  document.querySelector("main > header")?.insertAdjacentElement("afterend", heading);
  return heading;
}

function setWorkspaceChildren(view) {
  const decisionRail = document.querySelector(".decision-rail");
  const priority = document.querySelector("#intelligence");
  const radar = document.querySelector(".portfolio-radar");
  [priority, radar].forEach((node) => node?.classList.remove("workspace-child-hidden"));
  decisionRail?.classList.remove("workspace-single");
  if (view === "news") {
    radar?.classList.add("workspace-child-hidden");
    decisionRail?.classList.add("workspace-single");
  }

  const portfolioGrid = document.querySelector("#portfolio");
  const portfolioPanel = portfolioGrid?.querySelector(".portfolio-panel");
  const watchlistPanel = portfolioGrid?.querySelector("#watchlist");
  [portfolioPanel, watchlistPanel].forEach((node) => node?.classList.remove("workspace-child-hidden"));
  portfolioGrid?.classList.remove("workspace-single");
  if (view === "portfolio") {
    watchlistPanel?.classList.add("workspace-child-hidden");
    portfolioGrid?.classList.add("workspace-single");
  } else if (view === "watchlist") {
    portfolioPanel?.classList.add("workspace-child-hidden");
    portfolioGrid?.classList.add("workspace-single");
  }
}

function showWorkspace(requestedView, { push = true, smooth = true } = {}) {
  const view = WORKSPACE_VIEWS[requestedView] ? requestedView : "mission";
  const config = WORKSPACE_VIEWS[view];
  WORKSPACE_MANAGED_SELECTORS.forEach((selector) => document.querySelector(selector)?.classList.add("workspace-hidden"));
  config.selectors.forEach((selector) => document.querySelector(selector)?.classList.remove("workspace-hidden"));
  setWorkspaceChildren(view);

  document.body.dataset.workspace = view;
  document.querySelectorAll("[data-workspace-link]").forEach((link) => {
    const active = link.dataset.workspaceLink === view;
    link.classList.toggle("active", active && link.closest("nav"));
    if (active && link.closest("nav")) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const heading = workspaceHeading();
  heading.hidden = view === "mission" || view === "chart";
  heading.querySelector(".workspace-view-heading__eyebrow").textContent = config.eyebrow;
  heading.querySelector("h1").textContent = config.title;
  heading.querySelector("div > p:last-child").textContent = config.description;
  heading.querySelector(".workspace-view-heading__mark").textContent = config.mark;
  const crumb = document.querySelector(".crumb");
  if (crumb) crumb.innerHTML = `${config.title.toUpperCase()} <span>/ ${config.eyebrow}</span>`;

  if (push) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    url.hash = "";
    window.history.pushState({ view }, "", url);
  }
  window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
}

document.querySelectorAll("[data-workspace-link]").forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  showWorkspace(link.dataset.workspaceLink);
}));

const WORKSPACE_HASH_MAP = {
  "#portfolio": "portfolio",
  "#watchlist": "watchlist",
  "#intelligence": "news",
  "#recommendations": "ai",
  "#markets": "market",
  "#live-chart": "chart"
};

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const view = WORKSPACE_HASH_MAP[link.getAttribute("href")];
  if (!view) return;
  event.preventDefault();
  showWorkspace(view);
});

window.addEventListener("popstate", () => showWorkspace(new URLSearchParams(window.location.search).get("view") || "mission", { push: false, smooth: false }));
showWorkspace(new URLSearchParams(window.location.search).get("view") || "mission", { push: false, smooth: false });
