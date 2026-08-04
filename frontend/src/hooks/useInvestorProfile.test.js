import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import useInvestorProfile from "./useInvestorProfile";
import { investorProfileApi } from "../services/api";

vi.mock("../services/api", () => ({
  investorProfileApi: {
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getInvestmentProfile: vi.fn(),
  },
}));

const PROFILE_FIXTURE = { id: "p1", age: 17, riskTolerance: "MEDIUM" };

function notFoundError() {
  const error = new Error("No investor profile exists yet.");
  error.status = 404;
  return error;
}

function networkError() {
  // Mirrors a real fetch()-level failure (offline, DNS, timeout): no
  // .status at all, unlike an HTTP error response.
  return new Error("Failed to fetch");
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe("useInvestorProfile", () => {
  it("sets hasProfile=true and caches the profile when one exists server-side", async () => {
    investorProfileApi.get.mockResolvedValue(PROFILE_FIXTURE);

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasProfile).toBe(true);
    expect(result.current.profile).toEqual(PROFILE_FIXTURE);
    expect(localStorage.getItem("impactone-onboarded")).toBe("true");
  });

  it("sets hasProfile=false when no profile exists yet (real 404)", async () => {
    investorProfileApi.get.mockRejectedValue(notFoundError());

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasProfile).toBe(false);
    expect(result.current.profile).toBe(null);
    expect(localStorage.getItem("impactone-onboarded")).toBe(null);
  });

  it("self-corrects a stale localStorage flag if the real profile is gone (404)", async () => {
    localStorage.setItem("impactone-onboarded", "true");
    investorProfileApi.get.mockRejectedValue(notFoundError());

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasProfile).toBe(false);
    expect(localStorage.getItem("impactone-onboarded")).toBe(null);
  });

  it("Sprint 34 — a network failure (no .status) does NOT clear a returning user's onboarded flag or bounce them into onboarding", async () => {
    localStorage.setItem("impactone-onboarded", "true");
    investorProfileApi.get.mockRejectedValue(networkError());

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasProfile).toBe(true);
    expect(localStorage.getItem("impactone-onboarded")).toBe("true");
  });

  it("Sprint 34 — a network failure with no prior onboarded flag reports hasProfile=null (honestly unknown), not false", async () => {
    investorProfileApi.get.mockRejectedValue(networkError());

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasProfile).toBe(null);
    expect(localStorage.getItem("impactone-onboarded")).toBe(null);
  });

  it("createProfile sets hasProfile=true and the onboarded flag", async () => {
    investorProfileApi.get.mockRejectedValue(notFoundError());
    investorProfileApi.create.mockResolvedValue(PROFILE_FIXTURE);

    const { result } = renderHook(() => useInvestorProfile());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createProfile({ age: 17 });
    });

    expect(result.current.hasProfile).toBe(true);
    expect(result.current.profile).toEqual(PROFILE_FIXTURE);
    expect(localStorage.getItem("impactone-onboarded")).toBe("true");
  });
});
