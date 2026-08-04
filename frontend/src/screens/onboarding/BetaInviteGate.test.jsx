import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BetaInviteGate from "./BetaInviteGate";

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

// Phase X4 — resolve/error logic moved into useBetaIdentity.js; this
// component is now a thin, presentational shell driven by props, so its
// tests exercise the shell's contract (skip, submit, friendly message
// display) against a mocked resolveCode rather than the real API.
describe("BetaInviteGate", () => {
  it("skipping without a code calls onDone and never calls resolveCode", () => {
    const onDone = vi.fn();
    const resolveCode = vi.fn();
    render(<BetaInviteGate onDone={onDone} resolveCode={resolveCode} message="" />);
    fireEvent.click(screen.getByText("Skip"));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(resolveCode).not.toHaveBeenCalled();
  });

  it("submitting a code calls resolveCode and, on success, onDone", async () => {
    const onDone = vi.fn();
    const resolveCode = vi.fn().mockResolvedValue(true);
    render(<BetaInviteGate onDone={onDone} resolveCode={resolveCode} message="" />);

    fireEvent.change(screen.getByPlaceholderText("Invite code"), { target: { value: "ABC123" } });
    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(resolveCode).toHaveBeenCalledWith("ABC123");
  });

  it("a failed resolveCode never calls onDone, and renders the given friendly message — never a raw error", async () => {
    const onDone = vi.fn();
    const resolveCode = vi.fn().mockResolvedValue(false);
    const { rerender } = render(<BetaInviteGate onDone={onDone} resolveCode={resolveCode} message="" />);

    fireEvent.change(screen.getByPlaceholderText("Invite code"), { target: { value: "NOPE" } });
    fireEvent.click(screen.getByText("Continue"));
    await waitFor(() => expect(resolveCode).toHaveBeenCalled());

    rerender(<BetaInviteGate onDone={onDone} resolveCode={resolveCode} message="That invite code wasn't recognized. Double-check it and try again." />);
    expect(screen.getByText("That invite code wasn't recognized. Double-check it and try again.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("renders a custom recovery title/description when provided (expired/invalid identity flow)", () => {
    render(
      <BetaInviteGate
        onDone={vi.fn()}
        resolveCode={vi.fn()}
        message=""
        title="Your invite has expired"
        description="Ask the founder for a new invite code."
      />
    );
    expect(screen.getByText("Your invite has expired")).toBeInTheDocument();
    expect(screen.getByText("Ask the founder for a new invite code.")).toBeInTheDocument();
  });
});
