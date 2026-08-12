import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en.json";
import he from "./locales/he.json";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent, formatRelativeTime, formatTime } from "./formatters";

const LOCALE_STORAGE_KEY = "impactone-locale";

// Sprint 35 — Internationalization Foundation. English is the only
// translated locale right now (this sprint builds the infrastructure,
// not the translations — per the mission, do NOT translate yet). Adding
// a new language later is: drop a new locales/<code>.json file with the
// same key shape as en.json, then add one line here. Nothing else in the
// app needs to change — every component already goes through t(), and
// direction/formatting are derived from the active locale automatically.
const LOCALE_REGISTRY = {
  en: { label: "English", dictionary: en },
  he: { label: "עברית", dictionary: he },
};

// Hebrew is a content preference, not a shell-language switch. Financial
// symbols, charts and the product controls remain in their established
// English/LTR layout; only dedicated translated editorial surfaces may opt
// into Hebrew copy. This avoids the confusing mixed-direction dashboard.
const HEBREW_CONTENT_PREFIXES = ["news.", "recommendations."];

function usesHebrewContent(locale, key) {
  return locale === "he" && HEBREW_CONTENT_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function readStoredLocale() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored && LOCALE_REGISTRY[stored] ? stored : null;
}

function detectBrowserLocale() {
  if (typeof navigator === "undefined") return "en";
  const languageCode = String(navigator.language || "en").split("-")[0].toLowerCase();
  return LOCALE_REGISTRY[languageCode] ? languageCode : "en";
}

function resolveKey(dictionary, key) {
  return key.split(".").reduce((node, segment) => (node && typeof node === "object" ? node[segment] : undefined), dictionary);
}

// Sprint 35 — {placeholder} interpolation, the minimum any real
// translation will need (e.g. "Updated {minutes} min ago"). No
// pluralization engine yet — not needed until a second language with
// different plural rules actually ships, and adding it later doesn't
// require touching any call site (t() already takes a params object).
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match));
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => readStoredLocale() || detectBrowserLocale());

  useEffect(() => {
    const dir = "ltr";
    document.documentElement.setAttribute("lang", locale === "he" ? "en" : locale);
    document.documentElement.setAttribute("dir", dir);
  }, [locale]);

  const setLocale = useCallback((nextLocale) => {
    if (!LOCALE_REGISTRY[nextLocale]) return;
    setLocaleState(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  }, []);

  const t = useCallback((key, params) => {
    const activeDictionary = usesHebrewContent(locale, key) ? he : en;
    const value = resolveKey(activeDictionary, key) ?? resolveKey(en, key);
    if (value === undefined) return key;
    return interpolate(value, params);
  }, [locale]);

  const value = useMemo(() => {
    const dir = "ltr";
    return {
      locale,
      setLocale,
      dir,
      isRtl: false,
      contentLocale: locale,
      t,
      availableLocales: Object.entries(LOCALE_REGISTRY).map(([code, { label }]) => ({ code, label })),
      formatDate: (value, options) => formatDate(value, "en", options),
      formatTime: (value, options) => formatTime(value, "en", options),
      formatDateTime: (value, options) => formatDateTime(value, "en", options),
      formatNumber: (value, options) => formatNumber(value, "en", options),
      formatCurrency: (value, currencyCode, options) => formatCurrency(value, "en", currencyCode, options),
      formatPercent: (value, options) => formatPercent(value, "en", options),
      formatRelativeTime: (value) => formatRelativeTime(value, "en"),
    };
  }, [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

// Convenience alias matching the common `useTranslation()` naming other
// React i18n libraries use, for anyone joining from that background.
export const useTranslation = useI18n;
