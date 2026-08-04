import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppErrorBoundary from "./AppErrorBoundary";

function Bomb() {
  throw new Error("boom");
}

describe("AppErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <AppErrorBoundary>
        <p>real content</p>
      </AppErrorBoundary>
    );
    expect(screen.getByText("real content")).toBeInTheDocument();
  });

  it("catches a render-time throw and shows an investor-friendly recovery screen — never a blank page", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );
    expect(screen.getByText("Something went wrong loading the app")).toBeInTheDocument();
    expect(screen.queryByText(/boom/)).not.toBeInTheDocument();
    consoleError.mockRestore();
  });

  it("the reload button calls window.location.reload", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload };

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>
    );
    fireEvent.click(screen.getByText("Reload ImpactOne"));
    expect(reload).toHaveBeenCalledTimes(1);

    window.location = originalLocation;
    consoleError.mockRestore();
  });
});
