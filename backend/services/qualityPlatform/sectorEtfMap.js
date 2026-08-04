// Sprint 42 — a small, honest sector -> representative S&P sector ETF map.
// No symbol->sector mapping exists anywhere in this codebase (only a
// free-text Position.sector field) — this module only maps a KNOWN sector
// string to its ETF; a caller with no real sector for a recommendation gets
// null back, never a guessed one.
const SECTOR_TO_ETF = {
  Technology: "XLK",
  "Information Technology": "XLK",
  Healthcare: "XLV",
  "Health Care": "XLV",
  Energy: "XLE",
  Financial: "XLF",
  Financials: "XLF",
  "Consumer Discretionary": "XLY",
  "Consumer Staples": "XLP",
  Industrials: "XLI",
  Communication: "XLC",
  "Communication Services": "XLC",
  Utilities: "XLU",
  "Real Estate": "XLRE",
  Materials: "XLB",
};

function getSectorEtf(sector) {
  if (!sector) return null;
  return SECTOR_TO_ETF[sector] || null;
}

module.exports = { SECTOR_TO_ETF, getSectorEtf };
