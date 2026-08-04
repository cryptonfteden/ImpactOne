import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import NovaShowcaseScreen from "./NovaShowcaseScreen";
import { ThemeProvider } from "../context/ThemeProvider";

function renderShowcase() {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  return render(
    <ThemeProvider>
      <NovaShowcaseScreen />
    </ThemeProvider>
  );
}

const EXPECTED_SECTION_HEADINGS = [
  "Brand Identity",
  "Color System",
  "Buttons",
  "Inputs",
  "Cards",
  "AI Components",
  "Data Visualization",
  "Navigation",
  "Notifications",
  "Loading",
  "Motion Showcase",
  "Accessibility",
  "Responsive",
];

describe("NovaShowcaseScreen (Phase X12C.0)", () => {
  it("renders all 13 required sections, in order", () => {
    renderShowcase();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(EXPECTED_SECTION_HEADINGS);
  });

  it("marks itself as development-only in visible copy", () => {
    renderShowcase();
    expect(screen.getByText(/Development Only/i)).toBeInTheDocument();
  });

  it("renders real AI Recommendation cards with a confidence badge", () => {
    renderShowcase();
    expect(screen.getAllByText(/\/100/).length).toBeGreaterThan(0);
  });

  it("renders the Buttons section with every required variant", () => {
    renderShowcase();
    expect(screen.getByText("Primary")).toBeInTheDocument();
    expect(screen.getByText("Secondary")).toBeInTheDocument();
    expect(screen.getByText("Ghost")).toBeInTheDocument();
    expect(screen.getByText("Danger")).toBeInTheDocument();
    expect(screen.getAllByText("Success").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Loading").length).toBeGreaterThan(0);
    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });
});
