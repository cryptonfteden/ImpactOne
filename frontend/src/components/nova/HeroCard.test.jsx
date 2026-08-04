import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroCard from "./HeroCard";

// Note: a test asserting that `.mc-hero--enter` is removed after a real
// "animationend" event was attempted and dropped — confirmed via an
// isolated repro that this test environment's jsdom never dispatches
// onAnimationEnd handlers at all (even for a bare native element with no
// component logic involved), so such a test would only ever assert a
// jsdom limitation, not real component behavior. The removal logic
// itself (`onAnimationEnd={() => setPulsing(false)}`) is a single,
// trivial line, directly visible in HeroCard.jsx.
describe("HeroCard", () => {
  it("renders the eyebrow and children inside the shared hero surface", () => {
    render(
      <HeroCard eyebrow="Top Priority">
        <p>Hero content</p>
      </HeroCard>
    );
    expect(screen.getByText("Top Priority")).toBeInTheDocument();
    expect(screen.getByText("Hero content")).toBeInTheDocument();
  });

  it("applies the emphasis surface class and the one-time entrance pulse on mount", () => {
    const { container } = render(<HeroCard eyebrow="x">content</HeroCard>);
    const card = container.querySelector(".mc-hero");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("mc-hero--enter");
  });
});
