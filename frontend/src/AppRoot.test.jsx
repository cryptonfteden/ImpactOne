import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppRoot from "./AppRoot";
import useInvestorProfile from "./hooks/useInvestorProfile";

vi.mock("./hooks/useInvestorProfile");
vi.mock("./layout/MainLayout", () => ({ default: () => <div>Main app shell</div> }));
vi.mock("./screens/onboarding/OnboardingFlow", () => ({ default: () => <div>Onboarding flow</div> }));

afterEach(() => {
  window.localStorage.clear();
});

describe("AppRoot", () => {
  it("renders neither shell while the profile check is loading", () => {
    useInvestorProfile.mockReturnValue({ hasProfile: null, isLoading: true, createProfile: vi.fn() });
    render(<AppRoot />);
    expect(screen.queryByText("Main app shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding flow")).not.toBeInTheDocument();
  });

  // Phase H2 — a genuinely fresh browser (no profile, never seen the beta
  // invite gate) sees the gate first, not OnboardingFlow directly.
  it("renders the beta invite gate before onboarding for a fresh browser with no profile", () => {
    useInvestorProfile.mockReturnValue({ hasProfile: false, isLoading: false, createProfile: vi.fn() });
    render(<AppRoot />);
    expect(screen.getByText("Have an invite code?")).toBeInTheDocument();
    expect(screen.queryByText("Onboarding flow")).not.toBeInTheDocument();
  });

  it("renders OnboardingFlow when no profile exists and the beta invite gate was already seen", () => {
    window.localStorage.setItem("impactone-beta-invite-seen", "1");
    useInvestorProfile.mockReturnValue({ hasProfile: false, isLoading: false, createProfile: vi.fn() });
    render(<AppRoot />);
    expect(screen.getByText("Onboarding flow")).toBeInTheDocument();
  });

  it("renders MainLayout when a profile exists", () => {
    useInvestorProfile.mockReturnValue({ hasProfile: true, isLoading: false, createProfile: vi.fn() });
    render(<AppRoot />);
    expect(screen.getByText("Main app shell")).toBeInTheDocument();
  });
});
