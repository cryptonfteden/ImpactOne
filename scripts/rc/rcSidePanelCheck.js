// Phase X7-RC — explicit Stock Side Panel + Impact Graph verification.
const { chromium } = require("playwright");

const BASE_URL = process.argv[2] || "http://localhost:5173";
const OUT_DIR = process.argv[3] || ".";

function log(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 200));
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  for (let i = 0; i < 6; i++) {
    const gotIt = page.getByText(/^Got it$/i).first();
    if (await gotIt.isVisible().catch(() => false)) await gotIt.click().catch(() => {});
    else break;
    await page.waitForTimeout(200);
  }

  // Navigate to Market Dashboard, click a real symbol name to open the
  // Stock Side Panel (every symbol button dispatches openSymbolPanel).
  await page.locator(".sidebar-link", { hasText: "Market Dashboard" }).first().click();
  await page.waitForTimeout(800);
  const symbolButton = page.locator(".ghost-button").filter({ hasText: /^[A-Z]{1,5}$/ }).first();
  const hasSymbol = await symbolButton.isVisible().catch(() => false);
  log("Market Dashboard has a real, clickable symbol", hasSymbol);

  if (hasSymbol) {
    await symbolButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT_DIR}/side-panel-01-open.png` });
    const panelVisible = await page.locator(".side-panel-overlay").isVisible().catch(() => false);
    log("Stock Side Panel opens on symbol click", panelVisible);

    const impactGraphSection = page.getByText("Impact Graph", { exact: true }).first();
    if (await impactGraphSection.isVisible().catch(() => false)) {
      await impactGraphSection.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT_DIR}/side-panel-02-impact-graph.png` });
      log("Impact Graph section renders inside Side Panel", true);
    } else {
      log("Impact Graph section renders inside Side Panel", false);
    }
  }

  const finalErrors = [...new Set(consoleErrors)];
  console.log("\nUnique console errors:", finalErrors.length);
  finalErrors.forEach((e) => console.log(" -", e));

  await browser.close();
}

main().catch((err) => {
  console.error("Side panel check crashed:", err);
  process.exit(1);
});
