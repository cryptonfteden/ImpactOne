// Sprint 35 — Internationalization Foundation. Every locale whose base
// language is written right-to-left. Adding a new RTL language later is a
// one-line addition here, not a UI change — direction is derived from the
// active locale everywhere else in the app.
export const RTL_LANGUAGE_CODES = new Set(["ar", "he", "fa", "ur", "yi", "ps", "sd"]);

export function isRtlLocale(locale) {
  const languageCode = String(locale || "").split("-")[0].toLowerCase();
  return RTL_LANGUAGE_CODES.has(languageCode);
}
