import AppErrorBoundary from "./AppErrorBoundary";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "./ThemeProvider";

// Phase X12B — NOVA Foundation, Part 2. Additive: ThemeProvider only sets
// data-theme/data-motion attributes on <html> (see ThemeProvider.jsx) —
// no existing screen references those attributes yet, so wiring it in
// here changes zero rendered pixels for any current screen.
export default function AppProviders({ children }) {
  return (
    <AppErrorBoundary>
      <I18nProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nProvider>
    </AppErrorBoundary>
  );
}
