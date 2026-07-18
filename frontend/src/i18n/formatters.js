// Sprint 35 — Internationalization Foundation. Locale-aware formatting
// built entirely on the native Intl API (no dependency needed) so every
// number/date/time/currency respects whatever locale is active, instead
// of the app's prior hardcoded en-US-shaped calls
// (toLocaleString()/toFixed() with no locale argument).

export function formatDate(value, locale, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", ...options }).format(date);
}

export function formatTime(value, locale, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { timeStyle: "short", ...options }).format(date);
}

export function formatDateTime(value, locale, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", ...options }).format(date);
}

export function formatNumber(value, locale, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat(locale, options).format(number);
}

export function formatCurrency(value, locale, currencyCode = "USD", options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  return new Intl.NumberFormat(locale, { style: "currency", currency: currencyCode, ...options }).format(number);
}

export function formatPercent(value, locale, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  // Callers already pass values as whole percentages (e.g. 12.4 for
  // 12.4%), matching every existing `${x}%` call site in this app —
  // Intl's "percent" style expects a 0-1 fraction, so divide here rather
  // than changing what every caller passes in.
  return new Intl.NumberFormat(locale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2, ...options }).format(number / 100);
}

export function formatRelativeTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}
