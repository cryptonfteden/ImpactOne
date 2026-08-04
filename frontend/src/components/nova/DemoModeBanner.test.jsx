import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import DemoModeBanner from "./DemoModeBanner";

const LABELS = { a: "Section A", b: "Section B" };

describe("DemoModeBanner", () => {
  it("renders nothing at all when every section is live", () => {
    const { container } = render(<DemoModeBanner liveSections={{ a: true, b: true }} sectionLabels={LABELS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the full Demo Mode message when every section fell back", () => {
    render(<DemoModeBanner liveSections={{ a: false, b: false }} sectionLabels={LABELS} />);
    const indicator = screen.getByRole("status", { name: "Demo mode: showing simulated intelligence, not live data." });
    expect(within(indicator).getByText("Demo")).toBeInTheDocument();
    expect(within(indicator).getByText(/does not reflect your real portfolio or live/)).toBeInTheDocument();
  });

  it("names the specific section(s) still on fallback content during a partial outage", () => {
    render(<DemoModeBanner liveSections={{ a: false, b: true }} sectionLabels={LABELS} />);
    const indicator = screen.getByRole("status", { name: "Some sections are showing simulated data because a live service is unavailable." });
    expect(within(indicator).getByText(/Demo data/)).toBeInTheDocument();
    expect(within(indicator).getByText(/Section A/)).toBeInTheDocument();
    expect(within(indicator).queryByText(/Section B/)).not.toBeInTheDocument();
  });

  it("never names a section that is genuinely live", () => {
    render(<DemoModeBanner liveSections={{ a: false, b: true, c: true }} sectionLabels={{ ...LABELS, c: "Section C" }} />);
    const indicator = screen.getByRole("status", { name: /Some sections/ });
    expect(within(indicator).getByText(/Section A/)).toBeInTheDocument();
    expect(within(indicator).queryByText(/Section B/)).not.toBeInTheDocument();
    expect(within(indicator).queryByText(/Section C/)).not.toBeInTheDocument();
  });
});
