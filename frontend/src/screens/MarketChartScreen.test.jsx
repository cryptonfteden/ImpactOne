import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/I18nProvider";
import MarketChartScreen from "./MarketChartScreen";

vi.mock("../components/chart/AdvancedChart", () => ({
  default: ({ symbol }) => <div data-testid="advanced-chart">{symbol}</div>,
}));

function renderScreen() {
  return render(<I18nProvider><MarketChartScreen /></I18nProvider>);
}

describe("MarketChartScreen workspace mode", () => {
  it("keeps application navigation visible until expanded mode is requested", () => {
    const { container } = renderScreen();
    const workspace = container.querySelector(".market-chart-screen");

    expect(workspace).not.toHaveClass("market-chart-screen--expanded");
    expect(screen.getByRole("button", { name: "Expand chart" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand chart" }));

    expect(workspace).toHaveClass("market-chart-screen--expanded");
    expect(screen.getByRole("button", { name: "Exit expanded chart" })).toBeInTheDocument();
  });
});
