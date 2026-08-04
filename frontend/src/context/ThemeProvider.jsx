import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// Phase X12B — NOVA Foundation, Part 2: Theme Engine (JS half).
//
// The resolution mechanism TOKEN_REVIEW.md required be named explicitly:
// this provider sets a `data-theme` attribute on <html>, and every
// theme's real values live in theme.css as CSS custom properties (see
// that file's header comment). This provider itself never renders a
// styled pixel — it only manages *which* theme is active and persists
// the choice, mirroring I18nProvider.jsx's exact shape (readStored →
// detect-default → setState → persist → reflect onto <html>) so anyone
// already familiar with that provider needs zero new mental model here.
//
// Four themes (mission-required): "dark" (default), "light", and
// "high-contrast" are color themes (mutually exclusive, `data-theme`).
// "Reduced motion" is a SEPARATE, independent axis (`data-motion`) — a
// user can want light + reduced-motion, or dark + reduced-motion, so it
// is never folded into the theme enum.
const THEME_STORAGE_KEY = "impactone-theme";
const MOTION_STORAGE_KEY = "impactone-motion-preference";

export const THEMES = Object.freeze({
  DARK: "dark",
  LIGHT: "light",
  HIGH_CONTRAST: "high-contrast",
});

const VALID_THEMES = new Set(Object.values(THEMES));

export const MOTION_PREFERENCES = Object.freeze({
  FULL: "full",
  REDUCED: "reduced",
});

function readStoredTheme() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored && VALID_THEMES.has(stored) ? stored : null;
}

function detectSystemTheme() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return THEMES.DARK;
  // Real, standard OS-level hooks — no defaulting to dark "because that's
  // the brand default" when the OS/user has explicitly asked for
  // something else. forced-colors covers Windows High Contrast Mode.
  if (window.matchMedia("(forced-colors: active)").matches) return THEMES.HIGH_CONTRAST;
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return THEMES.LIGHT;
  return THEMES.DARK;
}

function readStoredMotionPreference() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(MOTION_STORAGE_KEY);
  return stored === MOTION_PREFERENCES.REDUCED || stored === MOTION_PREFERENCES.FULL ? stored : null;
}

function detectSystemMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return MOTION_PREFERENCES.FULL;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? MOTION_PREFERENCES.REDUCED : MOTION_PREFERENCES.FULL;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme() || detectSystemTheme());
  const [motionPreference, setMotionPreferenceState] = useState(() => readStoredMotionPreference() || detectSystemMotionPreference());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", motionPreference);
  }, [motionPreference]);

  const setTheme = useCallback((nextTheme) => {
    if (!VALID_THEMES.has(nextTheme)) return;
    setThemeState(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const setMotionPreference = useCallback((nextPreference) => {
    if (nextPreference !== MOTION_PREFERENCES.REDUCED && nextPreference !== MOTION_PREFERENCES.FULL) return;
    setMotionPreferenceState(nextPreference);
    window.localStorage.setItem(MOTION_STORAGE_KEY, nextPreference);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      availableThemes: Object.values(THEMES),
      motionPreference,
      setMotionPreference,
      prefersReducedMotion: motionPreference === MOTION_PREFERENCES.REDUCED,
    }),
    [theme, setTheme, motionPreference, setMotionPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
