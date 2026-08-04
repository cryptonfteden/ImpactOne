import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useBetaIdentity, IDENTITY_STATUS, BETA_USER_ID_STORAGE_KEY, BETA_USER_LABEL_STORAGE_KEY } from "./useBetaIdentity";
import { betaApi } from "../services/api";

vi.mock("../services/api", () => ({
  betaApi: { resolveInviteCode: vi.fn(), whoami: vi.fn() },
}));

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.clearAllMocks();
});

describe("useBetaIdentity", () => {
  it("with no URL code and no stored identity, settles on NEEDS_CODE — never stuck CHECKING", async () => {
    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.NEEDS_CODE));
    expect(result.current.identity).toBeNull();
  });

  it("a real invite code in the URL resolves automatically with zero manual steps and strips the param", async () => {
    window.history.replaceState({}, "", "/?invite=ABC123");
    betaApi.resolveInviteCode.mockResolvedValue({ betaUserId: "beta-1", label: "Alex" });

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.READY));

    expect(betaApi.resolveInviteCode).toHaveBeenCalledWith("ABC123");
    expect(result.current.identity).toEqual({ betaUserId: "beta-1", label: "Alex" });
    expect(window.localStorage.getItem(BETA_USER_ID_STORAGE_KEY)).toBe("beta-1");
    expect(window.location.search).toBe("");
  });

  it("an expired URL invite code produces a friendly EXPIRED state, never a raw error", async () => {
    window.history.replaceState({}, "", "/?invite=OLD");
    const error = new Error("That invite code has expired.");
    error.errorCode = "EXPIRED_CODE";
    betaApi.resolveInviteCode.mockRejectedValue(error);

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.EXPIRED));
    expect(result.current.message).not.toMatch(/EXPIRED_CODE/);
    expect(result.current.message).toMatch(/expired/i);
  });

  it("a stored identity is restored and re-validated via whoami on mount (session restoration)", async () => {
    window.localStorage.setItem(BETA_USER_ID_STORAGE_KEY, "beta-1");
    window.localStorage.setItem(BETA_USER_LABEL_STORAGE_KEY, "Alex");
    betaApi.whoami.mockResolvedValue({ betaUserId: "beta-1", label: "Alex" });

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.READY));
    expect(result.current.identity).toEqual({ betaUserId: "beta-1", label: "Alex" });
  });

  it("a stored identity that no longer resolves (deleted/expired server-side) clears storage and asks for recovery", async () => {
    window.localStorage.setItem(BETA_USER_ID_STORAGE_KEY, "stale-id");
    betaApi.whoami.mockResolvedValue(null);

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.INVALID));
    expect(window.localStorage.getItem(BETA_USER_ID_STORAGE_KEY)).toBeNull();
  });

  it("a network failure while restoring trusts the stored identity rather than fabricating an invalid diagnosis", async () => {
    window.localStorage.setItem(BETA_USER_ID_STORAGE_KEY, "beta-1");
    window.localStorage.setItem(BETA_USER_LABEL_STORAGE_KEY, "Alex");
    betaApi.whoami.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.READY));
    expect(result.current.identity).toEqual({ betaUserId: "beta-1", label: "Alex" });
  });

  it("logout clears identity and localStorage, returning to NEEDS_CODE", async () => {
    window.localStorage.setItem(BETA_USER_ID_STORAGE_KEY, "beta-1");
    betaApi.whoami.mockResolvedValue({ betaUserId: "beta-1", label: "Alex" });

    const { result } = renderHook(() => useBetaIdentity());
    await waitFor(() => expect(result.current.status).toBe(IDENTITY_STATUS.READY));

    act(() => result.current.logout());

    expect(result.current.status).toBe(IDENTITY_STATUS.NEEDS_CODE);
    expect(result.current.identity).toBeNull();
    expect(window.localStorage.getItem(BETA_USER_ID_STORAGE_KEY)).toBeNull();
  });
});
