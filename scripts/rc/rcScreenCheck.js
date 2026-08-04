// Phase X7-RC — real Playwright driver against a live server. Each
// Playwright browser context is isolated storage by default — equivalent
// to a fresh browser profile / incognito / cleared local+session storage.
const { chromium } = require("playwright");
const fs = require("fs");

const BASE_URL = process.argv[2] || process.env.RC_BASE_URL || "http://localhost:5173";
const OUT_DIR = process.argv[3] || process.env.RC_OUT_DIR || ".";
const LABEL = process.argv[4] || "run";

function log(label, ok, detail) {
  const line = `${ok ? "PASS" : "FAIL"} — ${label}${detail ? `: ${detail}` : ""}`;
  console.log(line);
  return { label, ok, detail };
}

async function dismissOverlays(page) {
  for (let i = 0; i < 6; i++) {
    const gotIt = page.getByText(/^Got it$/i).first();
    const skip = page.getByText(/^Skip$/i).first();
    const cont = page.getByText(/Continue|Get started/i).first();
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click().catch(() => {});
    } else if (await skip.isVisible().catch(() => false)) {
      await skip.click().catch(() => {});
    } else if (await cont.isVisible().catch(() => false)) {
      await cont.click().catch(() => {});
    } else {
      break;
    }
    await page.waitForTimeout(300);
  }
}

async function clickNav(page, label) {
  const link = page.locator(`.sidebar-link`, { hasText: label }).first();
  if (await link.isVisible().catch(() => false)) {
    await link.click();
    await page.waitForTimeout(700);
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch();
  const results = [];
  const consoleErrors = [];
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text().slice(0, 200)}`);
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await dismissOverlays(page);
  await page.screenshot({ path: `${OUT_DIR}/${LABEL}-00-home.png` });
  const bodyLen = (await page.textContent("body"))?.length || 0;
  results.push(log(`[${LABEL}] Home renders`, bodyLen > 100, `body length ${bodyLen}`));

  const moreTools = page.getByText(/More tools/i).first();
  if (await moreTools.isVisible().catch(() => false)) {
    await moreTools.click().catch(() => {});
    await page.waitForTimeout(200);
  }

  const screens = [
    ["Market Dashboard", "market-dashboard"],
    ["Decision Center", "decision-center"],
    ["Portfolio", "portfolio"],
    ["Workspaces", "workspaces"],
    ["AI Analysis", "ai-analysis"],
  ];

  for (const [navLabel, slug] of screens) {
    const clicked = await clickNav(page, navLabel);
    if (!clicked) {
      results.push(log(`[${LABEL}] Navigate to ${navLabel}`, false, "nav link not found"));
      continue;
    }
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-${slug}.png` });
    const errorBoundaryHit = await page.getByText(/Something went wrong loading the app/i).isVisible().catch(() => false);
    const len = (await page.textContent("body"))?.length || 0;
    results.push(log(`[${LABEL}] ${navLabel} renders without crashing`, len > 100 && !errorBoundaryHit, `body length ${len}`));
  }

  const bell = page.locator(".notification-bell").first();
  if (await bell.isVisible().catch(() => false)) {
    await bell.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-notifications.png` });
    results.push(log(`[${LABEL}] Notifications panel opens`, true));
    await bell.click();
  } else {
    results.push(log(`[${LABEL}] Notifications bell reachable`, false));
  }

  const searchInput = page.locator('input[placeholder*="ticker" i], input[placeholder*="symbol" i], input[placeholder*="Ask about" i]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill("AAPL");
    await searchInput.press("Enter").catch(() => {});
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT_DIR}/${LABEL}-side-panel-or-search.png` });
    results.push(log(`[${LABEL}] Symbol search / side panel interaction`, true));
  }

  await page.waitForTimeout(500);
  const finalErrors = consoleErrors.filter((e, i) => consoleErrors.indexOf(e) === i);
  fs.writeFileSync(`${OUT_DIR}/${LABEL}-results.json`, JSON.stringify({ results, consoleErrors: finalErrors }, null, 2));
  console.log(`\n[${LABEL}] Unique console/page errors:`, finalErrors.length);
  finalErrors.forEach((e) => console.log(" -", e));

  await browser.close();
}

main().catch((err) => {
  console.error("RC check crashed:", err);
  process.exit(1);
});
