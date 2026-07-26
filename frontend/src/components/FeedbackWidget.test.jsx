import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeedbackWidget from "./FeedbackWidget";
import { feedbackApi } from "../services/api";

vi.mock("../services/api", () => ({
  feedbackApi: { submit: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FeedbackWidget", () => {
  it("is closed by default and opens on toggle", async () => {
    render(<FeedbackWidget currentScreen="Home" />);
    expect(screen.queryByPlaceholderText(/Tell us what's on your mind/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Give feedback"));
    expect(screen.getByPlaceholderText(/Tell us what's on your mind/)).toBeInTheDocument();
  });

  it("submits real feedback with the real current screen automatically attached", async () => {
    feedbackApi.submit.mockResolvedValue({ id: "f1" });
    render(<FeedbackWidget currentScreen="Decision Center" />);
    fireEvent.click(screen.getByLabelText("Give feedback"));

    fireEvent.click(screen.getByRole("button", { name: "Bug" }));
    fireEvent.change(screen.getByPlaceholderText(/Tell us what's on your mind/), { target: { value: "The chart froze" } });
    fireEvent.click(screen.getByText("Send feedback"));

    await waitFor(() =>
      expect(feedbackApi.submit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "BUG", message: "The chart froze", screen: "Decision Center" })
      )
    );
    await waitFor(() => expect(screen.getByText(/Thank you/)).toBeInTheDocument());
  });

  it("shows a friendly error and never blocks retry when submission fails", async () => {
    feedbackApi.submit.mockRejectedValue(new Error("network down"));
    render(<FeedbackWidget currentScreen="Home" />);
    fireEvent.click(screen.getByLabelText("Give feedback"));
    fireEvent.change(screen.getByPlaceholderText(/Tell us what's on your mind/), { target: { value: "real message" } });
    fireEvent.click(screen.getByText("Send feedback"));

    await waitFor(() => expect(screen.getByText("Couldn't send that just now. Please try again in a moment.")).toBeInTheDocument());
    expect(screen.queryByText("network down")).not.toBeInTheDocument();
  });

  it("the submit button is disabled with an empty message", () => {
    render(<FeedbackWidget currentScreen="Home" />);
    fireEvent.click(screen.getByLabelText("Give feedback"));
    expect(screen.getByText("Send feedback")).toBeDisabled();
  });
});
