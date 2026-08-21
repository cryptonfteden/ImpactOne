const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;

test("Mission Control site has its independent server and browser assets", () => {
  for (const file of ["server.js", "public/index.html", "public/styles.css", "public/interface-quality.css", "public/app.js"]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("every Mission Control workspace loads shared readability and interaction guardrails", () => {
  const page = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const quality = fs.readFileSync(path.join(root, "public/interface-quality.css"), "utf8");
  assert.match(page, /interface-quality\.css/);
  assert.match(quality, /:focus-visible/);
  assert.match(quality, /min-height:44px/);
  assert.match(quality, /max-height:90dvh/);
  assert.match(quality, /prefers-reduced-motion:reduce/);
  assert.match(quality, /\.command-search input:focus-visible[\s\S]{0,100}outline:none/);
  assert.match(quality, /\.command-search:focus-within[\s\S]{0,180}inset 0 0 0 1px/);
});

test("Mission Control exposes source transparency and responsive layouts", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const page = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const browserApp = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  const quality = fs.readFileSync(path.join(root, "public/interface-quality.css"), "utf8");
  assert.match(server, /app\.get\("\/api\/source-status"/);
  assert.match(page, /id="source-status-button"/);
  assert.match(page, /id="source-status-dialog"/);
  assert.match(browserApp, /function openSourceStatus/);
  assert.match(quality, /source-status-content/);
  assert.match(quality, /max-width:640px/);
});

test("Dashboard starts portfolio work concurrently and refreshes stale verified data without blocking", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  assert.match(server, /DASHBOARD_CACHE_TTL_MS\s*=\s*30\s*\*\s*1000/);
  assert.match(server, /portfolioRequest[\s\S]{0,260}Promise\.all/);
  assert.match(server, /X-ImpactOne-Cache/);
  assert.match(server, /isFresh\s*\?\s*"HIT"\s*:\s*"STALE"/);
  assert.match(server, /if \(!isFresh\) refreshDashboardCache\(\)\.catch/);
  assert.match(server, /X-ImpactOne-Generated-At/);
});

test("Mission Control site is self-contained and reads through its API bridge", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const page = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  assert.match(server, /app\.get\("\/api\/dashboard"/);
  assert.match(server, /127\.0\.0\.1:5000/);
  assert.match(server, /app\.post\("\/api\/assistant"/);
  assert.doesNotMatch(page, /127\.0\.0\.1:5174/);
  assert.match(page, /id="recommendations"/);
});

test("daily specialist picks and Gold stocks are exposed on Mission Control", () => {
  const server = fs.readFileSync(path.join(__dirname, "server.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "public", "index.html"), "utf8");
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  assert.match(server, /\/api\/daily-agent-picks/);
  assert.match(html, /AGENT SIGNALS/);
  assert.match(html, /Today’s.*Signal Radar/);
  assert.match(html, /id="gold-picks"/);
  assert.match(app, /loadDailyAgentPicks/);
});

test("insider radar never renders unverified discovery-only purchases", () => {
  const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  const renderStart = app.indexOf("function renderInsiderOpportunities");
  const renderEnd = app.indexOf("async function loadInsiderOpportunities", renderStart);
  const renderer = app.slice(renderStart, renderEnd);
  assert.match(renderer, /const approved = opportunities\.filter/);
  assert.match(renderer, /const shown = \[\.\.\.\(approved\.length \? approved : opportunities\)\]/);
  assert.doesNotMatch(renderer, /discoveredPurchases/);
  assert.doesNotMatch(renderer, /PENDING_SEC_VERIFICATION|SEC CHECK PENDING/);
});

test("independent chart uses one SVG pricing grid and cursor-centered wheel zoom", () => {
  const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "public/styles.css"), "utf8");
  assert.match(app, /function nicePriceStep/);
  assert.match(app, /surface\.addEventListener\("wheel"/);
  assert.match(app, /cursorRatio/);
  assert.match(app, /chartViewport = null/);
  assert.doesNotMatch(styles, /background-size:48px 48px/);
  assert.match(app, /<g class="chart-grid">/);
  assert.match(styles, /\.last-price\.up/);
});

test("Fibonacci follows the selected chart timeframe without forcing one year", () => {
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  assert.match(app, /setFibonacciVisible\(!fibonacciVisible\);[\s\S]{0,420}renderCurrentChart\(\)/);
  assert.match(app, /currentFibonacci\.analysisBarCount/);
  assert.doesNotMatch(app, /activeChartRange\s*=\s*["']1y["'][\s\S]{0,180}fibonacci/i);
  assert.doesNotMatch(app, /activeChartRange\s*!==\s*["']1y["'][\s\S]{0,120}setFibonacciVisible\(false\)/);
  assert.match(app, /fibonacciForSelectedRange\(data\.fibonacci, requestedRange, bars\)/);
  assert.match(app, /fibonacci\.sourceRange !== requestedRange/);
});

test("chart supports horizontal drag navigation and a live cursor price label", () => {
  const app = fs.readFileSync(path.join(__dirname, "public", "app.js"), "utf8");
  assert.match(app, /function bindChartPan/);
  assert.match(app, /surface\.classList\.add\("is-panning"\)/);
  assert.match(app, /class="crosshair-price"/);
  assert.match(app, /cursorPrice/);
  assert.match(app, /crosshair\.style\.display = "none"/);
});

test("watchlist symbols receive verified weekly 0.886 monitoring and open the weekly chart", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const page = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "public/app.js"), "utf8");
  assert.match(server, /app\.post\("\/api\/strategy-watchlist"/);
  assert.match(server, /readVerifiedTimeframe\(normalized, "1w"\)/);
  assert.match(server, /target \* 1\.05/);
  assert.match(server, /target \* 0\.95/);
  assert.match(page, /id="strategy-watchlist-form"/);
  assert.match(app, /activeChartRange = "1w"/);
  assert.match(app, /setFibonacciVisible\(true\)/);
});
