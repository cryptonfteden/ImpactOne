import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorState from "./ErrorState";

describe("ErrorState", () => {
  it("renders the plain single-line form when only message is passed — backward compatible", () => {
    const { container } = render(<ErrorState message="Couldn't load data." />);
    expect(screen.getByText("Couldn't load data.")).toBeInTheDocument();
    expect(container.querySelector(".error-state")).toBeNull();
  });

  it("shows the real reason (why) when provided", () => {
    render(<ErrorState message="Couldn't load data." reason="The market data provider timed out." />);
    expect(screen.getByText("The market data provider timed out.")).toBeInTheDocument();
  });

  it("shows a retry button that calls the real onRetry handler", () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Couldn't load data." onRetry={onRetry} retryLabel="Retry now" />);
    fireEvent.click(screen.getByText("Retry now"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("warns when the rest of the screen may not work, if canContinue is false", () => {
    render(<ErrorState message="Couldn't load data." canContinue={false} />);
    expect(screen.getByText(/may not work correctly/)).toBeInTheDocument();
  });
});
