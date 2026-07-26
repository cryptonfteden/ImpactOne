import { describe, expect, it, afterEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme, THEMES, MOTION_PREFERENCES } from "./ThemeProvider";

function Probe() {
  const { theme, setTheme, motionPreference, setMotionPreference, prefersReducedMotion, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="motion">{motionPreference}</span>
      <span data-testid="reduced">{String(prefersReducedMotion)}</span>
      <span data-testid="count">{availableThemes.length}</span>
      <button onClick={() => setTheme(THEMES.LIGHT)}>go light</button>
      <button onClick={() => setTheme("not-a-real-theme")}>go invalid</button>
      <button onClick={() => setMotionPreference(MOTION_PREFERENCES.REDUCED)}>reduce motion</button>
    </div>
  );
}

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-motion");
  vi.restoreAllMocks();
});

describe("ThemeProvider", () => {
  it("useTheme throws outside a ThemeProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow("useTheme must be used within a ThemeProvider");
    consoleError.mockRestore();
  });

  it("defaults to dark when the OS has no preference and nothing is stored", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("exposes all three real themes", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("count").textContent).toBe("3");
  });

  it("setTheme switches the theme and reflects it onto <html> as data-theme", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("go light"));
    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("setTheme silently ignores an invalid theme name", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("go invalid"));
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("persists the theme choice to localStorage and a fresh mount reads it back", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByText("go light"));
    unmount();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("motion preference is a separate axis from theme, and reflects onto <html> as data-motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("motion").textContent).toBe("full");
    fireEvent.click(screen.getByText("reduce motion"));
    expect(screen.getByTestId("motion").textContent).toBe("reduced");
    expect(screen.getByTestId("reduced").textContent).toBe("true");
    expect(document.documentElement.getAttribute("data-motion")).toBe("reduced");
    // Theme is untouched by the motion-preference change — separate axis.
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("detects forced-colors as the real signal for high-contrast, and light as a lower-priority fallback", () => {
    window.matchMedia = vi.fn((query) => ({
      matches: query === "(forced-colors: active)",
    }));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>
    );
    expect(screen.getByTestId("theme").textContent).toBe("high-contrast");
  });
});
