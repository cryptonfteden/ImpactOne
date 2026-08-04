// Phase ETF-FLOW-AGENT-001 — disclosed, hand-set reference tables for
// ETF classification. No real, licensed ETF fund-database exists in
// this codebase (confirmed by a dedicated research pass —
// services/providers/definitions/spdrProvider.js is an honest stub for
// exactly this reason), so "which sector/theme does this ETF track"
// and "is this ETF passive or active" are answered from a small,
// transparent, hand-maintained list of well-known real tickers — never
// inferred or fabricated. A ticker not in these tables honestly reports
// "unknown", never a guess.
const { SECTOR_TO_ETF, getSectorEtf } = require("../../qualityPlatform/sectorEtfMap");

// Real, well-known sector ETF tickers (the values of SECTOR_TO_ETF),
// reused here as the "recognized sector ETF" allowlist.
const SECTOR_ETF_TICKERS = new Set(Object.values(SECTOR_TO_ETF));

// Disclosed, hand-set thematic ETF -> theme name map (a handful of
// well-known, real thematic funds — not exhaustive).
const THEMATIC_ETF_MAP = {
  ARKK: "Disruptive Innovation",
  ARKG: "Genomic Revolution",
  ARKW: "Next Generation Internet",
  ICLN: "Clean Energy",
  TAN: "Solar Energy",
  ROBO: "Robotics & AI",
  BOTZ: "Robotics & AI",
  SOXX: "Semiconductors",
  SMH: "Semiconductors",
  SKYY: "Cloud Computing",
  HACK: "Cybersecurity",
  JETS: "Airlines",
  KWEB: "China Internet",
};

// Disclosed, hand-set passive/active classification for well-known real
// tickers. Broad low-cost index trackers and the SPDR sector suite are
// PASSIVE; well-known actively-managed funds are ACTIVE. Anything not
// listed honestly reports null (unknown), never guessed.
const PASSIVE_TICKERS = new Set([
  "SPY", "IVV", "VOO", "QQQ", "VTI", "DIA", "IWM",
  ...SECTOR_ETF_TICKERS,
]);
const ACTIVE_TICKERS = new Set(["ARKK", "ARKG", "ARKW", "JEPI", "JEPQ", "DIVO", "QYLD"]);

function getSectorNameForEtf(ticker) {
  const upper = ticker.toUpperCase();
  const entry = Object.entries(SECTOR_TO_ETF).find(([, etf]) => etf === upper);
  return entry ? entry[0] : null;
}

function isRecognizedEtf(ticker) {
  const upper = ticker.toUpperCase();
  return SECTOR_ETF_TICKERS.has(upper) || upper in THEMATIC_ETF_MAP || PASSIVE_TICKERS.has(upper) || ACTIVE_TICKERS.has(upper);
}

function getTheme(ticker) {
  return THEMATIC_ETF_MAP[ticker.toUpperCase()] || null;
}

function getPassiveActiveClassification(ticker) {
  const upper = ticker.toUpperCase();
  if (PASSIVE_TICKERS.has(upper)) return "PASSIVE";
  if (ACTIVE_TICKERS.has(upper)) return "ACTIVE";
  return null;
}

module.exports = {
  isRecognizedEtf,
  getTheme,
  getPassiveActiveClassification,
  getSectorEtf,
  getSectorNameForEtf,
  SECTOR_ETF_TICKERS,
  THEMATIC_ETF_MAP,
  PASSIVE_TICKERS,
  ACTIVE_TICKERS,
};
