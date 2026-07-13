// Sprint 20 — a small, honest lookup, not a real currency-conversion
// service: this only decides which symbol to display next to an amount the
// user typed in their own currency. No FX conversion happens anywhere.
const COUNTRY_TO_CURRENCY_SYMBOL = {
  US: "$",
  IL: "₪",
  GB: "£",
  CA: "CA$",
  AU: "A$",
  DE: "€",
  FR: "€",
  ES: "€",
  IT: "€",
  NL: "€",
  JP: "¥",
  IN: "₹",
};

const DEFAULT_CURRENCY_SYMBOL = "$";

export function getCurrencyForCountry(countryCode) {
  return COUNTRY_TO_CURRENCY_SYMBOL[String(countryCode || "").toUpperCase()] || DEFAULT_CURRENCY_SYMBOL;
}

export function formatCurrencyAmount(amount, countryCode) {
  const symbol = getCurrencyForCountry(countryCode);
  const value = Number(amount || 0);
  return `${symbol}${value.toLocaleString()}`;
}
