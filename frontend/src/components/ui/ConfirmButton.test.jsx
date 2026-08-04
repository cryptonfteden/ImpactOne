import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ConfirmButton from "./ConfirmButton";

describe("ConfirmButton", () => {
  it("does not call onConfirm on the first click — only arms the confirmation", () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton label="Reset portfolio" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText("Reset portfolio"));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText(/Click again to confirm/)).toBeInTheDocument();
  });

  it("calls onConfirm on the second click", () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton label="Reset portfolio" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText("Reset portfolio"));
    fireEvent.click(screen.getByText(/Click again to confirm/));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disarms back to the original label after confirming", () => {
    const onConfirm = vi.fn();
    render(<ConfirmButton label="Reset portfolio" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByText("Reset portfolio"));
    fireEvent.click(screen.getByText(/Click again to confirm/));
    expect(screen.getByText("Reset portfolio")).toBeInTheDocument();
  });
});
