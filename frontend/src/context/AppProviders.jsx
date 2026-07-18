import AppErrorBoundary from "./AppErrorBoundary";
import { I18nProvider } from "../i18n/I18nProvider";

export default function AppProviders({ children }) {
  return (
    <AppErrorBoundary>
      <I18nProvider>{children}</I18nProvider>
    </AppErrorBoundary>
  );
}
