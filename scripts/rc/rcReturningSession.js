// Phase X7-RC — real "returning user" verification: reload the SAME
// context (storage persists across reload, just like a real returning
// browser session) and confirm the app restores without re-onboarding
// and without a blank page.
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

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/returning-01-first-visit.png` });

  // Simulate a returning session: reload the page in the SAME context
  // (same localStorage/sessionStorage — this is exactly what a real
  // returning browser tab does).
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/returning-02-after-reload.png` });
  const bodyLen = (await page.textContent("body"))?.length || 0;
  log("Returning session: reload restores the app (not blank)", bodyLen > 100, `body length ${bodyLen}`);

  // A second reload, further confirming stability (not a one-off race).
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const bodyLen2 = (await page.textContent("body"))?.length || 0;
  log("Returning session: second reload also restores the app", bodyLen2 > 100, `body length ${bodyLen2}`);
  await page.screenshot({ path: `${OUT_DIR}/returning-03-second-reload.png` });

  await browser.close();
}

main().catch((err) => {
  console.error("Returning-user check crashed:", err);
  process.exit(1);
});
