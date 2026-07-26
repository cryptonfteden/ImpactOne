// Phase X8 — Part 2, explicit cleared-storage scenarios. Loads the app,
// lets it run for a moment (real localStorage/sessionStorage may be
// written by then), clears exactly one storage type, reloads, and
// confirms the app still renders — never a blank page.
const { chromium } = require("playwright");

const BASE_URL = process.argv[2] || "http://localhost:5173";
const OUT_DIR = process.argv[3] || ".";

function log(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? `: ${detail}` : ""}`);
}

async function run(storageType) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  await page.evaluate((type) => {
    if (type === "local") window.localStorage.clear();
    else window.sessionStorage.clear();
  }, storageType);

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/cleared-${storageType}Storage.png` });
  const bodyLen = (await page.textContent("body"))?.length || 0;
  log(`Cleared ${storageType}Storage then reload: app renders (not blank)`, bodyLen > 100, `body length ${bodyLen}`);

  await browser.close();
}

async function main() {
  await run("local");
  await run("session");
}

main().catch((err) => {
  console.error("Storage-clear check crashed:", err);
  process.exit(1);
});
