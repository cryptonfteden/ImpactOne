import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UpdateBanner from "./UpdateBanner";

describe("UpdateBanner", () => {
  it("renders nothing until the update-available event fires", () => {
    render(<UpdateBanner />);
    expect(screen.queryByText(/new version/i)).not.toBeInTheDocument();
  });

  it("shows a reload prompt once impactone:update-available fires, and reload() runs on click", () => {
    render(<UpdateBanner />);

    fireEvent(window, new CustomEvent("impactone:update-available"));

    expect(screen.getByText(/new version of ImpactOne is ready/i)).toBeInTheDocument();

    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: reloadSpy };

    fireEvent.click(screen.getByText("Reload to update"));
    expect(reloadSpy).toHaveBeenCalled();

    window.location = originalLocation;
  });
});
