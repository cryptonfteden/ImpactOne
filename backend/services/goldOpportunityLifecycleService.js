const fs = require("fs/promises");
const path = require("path");

const DEFAULT_STORE = path.join(__dirname, "../../artifacts/runtime/gold-opportunity-lifecycle.json");

async function readStore(storePath) {
  try {
    return JSON.parse(await fs.readFile(storePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return { symbols: {} };
    throw error;
  }
}

async function writeStore(storePath, data) {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const temporary = `${storePath}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(temporary, storePath);
}

async function reconcileGoldLifecycle(opportunities = [], { storePath = DEFAULT_STORE, now = new Date().toISOString(), fullScanComplete = false } = {}) {
  const store = await readStore(storePath);
  const visible = new Set(opportunities.map((item) => item.symbol));
  const enriched = opportunities.map((item) => {
    const record = store.symbols[item.symbol] || { currentState: null, enteredAt: now, transitions: [] };
    const previousState = record.currentState;
    if (previousState !== item.state) {
      record.transitions.push({ from: previousState, to: item.state, at: now, score: item.score });
      record.currentState = item.state;
      record.enteredAt = now;
    }
    record.lastSeenAt = now;
    record.lastScore = item.score;
    store.symbols[item.symbol] = record;
    return { ...item, previousState, enteredAt: record.enteredAt, lifecycle: record.transitions.slice(-8) };
  });

  if (fullScanComplete) {
    Object.entries(store.symbols).forEach(([symbol, record]) => {
      if (!visible.has(symbol) && record.currentState !== "INVALIDATED") {
        record.transitions.push({ from: record.currentState, to: "INVALIDATED", at: now, score: record.lastScore ?? null });
        record.currentState = "INVALIDATED";
        record.enteredAt = now;
      }
    });
  }
  await writeStore(storePath, store);
  return enriched;
}

module.exports = { reconcileGoldLifecycle, readStore };
