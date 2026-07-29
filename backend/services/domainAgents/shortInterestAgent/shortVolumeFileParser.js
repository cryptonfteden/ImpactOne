// Phase SHORT-INTEREST-AGENT-001 — pure parsing of FINRA's real, free,
// no-auth daily Reg SHO short-volume file
// (https://cdn.finra.org/equity/regsho/daily/CNMSshvol{YYYYMMDD}.txt),
// a real pipe-delimited file with exactly one already-aggregated real
// row per symbol per real trading day:
//   Date|Symbol|ShortVolume|ShortExemptVolume|TotalVolume|Market
//
// This is real DAILY SHORT-SELLING VOLUME, a disclosed proxy for
// short-selling activity — NOT the official bi-monthly "short
// interest" figure (total open short shares, settlement-date), which
// requires a registered FINRA API/vendor this environment does not
// have (confirmed during development: every guessed free bi-monthly
// URL pattern returned a real 403). Every module built on this data
// discloses the distinction explicitly.
/**
 * @param {string} fileText - the real, raw FINRA daily short-volume file text
 * @param {string} date - YYYYMMDD, must match the file's own real date column
 * @param {string} symbol
 * @returns {{ date: string, symbol: string, shortVolume: number, shortExemptVolume: number, totalVolume: number, shortVolumeRatio: number } | null}
 */
function parseShortVolumeRow(fileText, date, symbol) {
  const lines = fileText.split("\n");
  for (const line of lines) {
    const fields = line.trim().split("|");
    if (fields.length < 5) continue;
    const [rowDate, rowSymbol, shortVolumeRaw, shortExemptVolumeRaw, totalVolumeRaw] = fields;
    if (rowDate !== date || rowSymbol !== symbol) continue;

    const shortVolume = Number(shortVolumeRaw);
    const shortExemptVolume = Number(shortExemptVolumeRaw);
    const totalVolume = Number(totalVolumeRaw);
    if (!Number.isFinite(shortVolume) || !Number.isFinite(totalVolume) || totalVolume <= 0) return null;

    return {
      date,
      symbol,
      shortVolume,
      shortExemptVolume: Number.isFinite(shortExemptVolume) ? shortExemptVolume : 0,
      totalVolume,
      shortVolumeRatio: Math.round((shortVolume / totalVolume) * 10000) / 10000,
    };
  }
  return null;
}

module.exports = { parseShortVolumeRow };
