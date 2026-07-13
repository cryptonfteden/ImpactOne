import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppRoot from "./AppRoot";
import useInvestorProfile from "./hooks/useInvestorProfile";

vi.mock("./hooks/useInvestorProfile");
vi.mock("./layout/MainLayout", () => ({ default: () => <div>Main app shell</div> }));
vi.mock("./screens/onboarding/OnboardingFlow", () => ({ default: () => <div>Onboarding flow</div> }));

describe("AppRoot", () => {
  it("renders neither shell while the profile check is loading", () => {
    useInvestorProfile.mockReturnValue({ hasProfile: null, isLoading: true, createProfile: vi.fn() });
    render(<AppRoot />);
    expect(screen.queryByText("Main app shell")).not.toBeInTheDocument();
    expect(screen.queryByText("Onboarding flow")).not.toBeInTheDocument();
  });

  it("renders OnboardingFlow when no profile exists", () => {
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
