import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import useRecommendations from "./useRecommendations";
import { recommendationsApi } from "../services/api";

vi.mock("../services/api", () => ({
  recommendationsApi: {
    list: vi.fn(),
    status: vi.fn(),
    run: vi.fn(),
  },
}));

const LIST_FIXTURE = { recommendations: [{ id: "1", symbol: "NVDA", action: "BUY" }] };
const STATUS_FIXTURE = { enabled: true, intervalMinutes: 30, latestRunLog: null };

function mockHappyPath() {
  recommendationsApi.list.mockResolvedValue(LIST_FIXTURE);
  recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useRecommendations", () => {
  it("loads recommendations and status on mount", async () => {
    mockHappyPath();

    const { result } = renderHook(() => useRecommendations({ autoRefresh: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.recommendations).toEqual(LIST_FIXTURE.recommendations);
    expect(result.current.status).toEqual(STATUS_FIXTURE);
    expect(result.current.error).toBe("");
  });

  it("surfaces a fetch error without throwing", async () => {
    recommendationsApi.list.mockRejectedValue(new Error("backend unavailable"));
    recommendationsApi.status.mockResolvedValue(STATUS_FIXTURE);

    const { result } = renderHook(() => useRecommendations({ autoRefresh: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("backend unavailable");
    expect(result.current.recommendations).toEqual([]);
  });

  it("runNow calls the API and refreshes state", async () => {
    mockHappyPath();
    recommendationsApi.run.mockResolvedValue({ recommendationsGenerated: 1 });

    const { result } = renderHook(() => useRecommendations({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.runNow();
    });

    expect(recommendationsApi.run).toHaveBeenCalledTimes(1);
    expect(recommendationsApi.list).toHaveBeenCalledTimes(2); // initial load + post-run refresh
    expect(result.current.actionError).toBe("");
  });

  it("runNow forwards the given watchlist to the API", async () => {
    mockHappyPath();
    recommendationsApi.run.mockResolvedValue({ recommendationsGenerated: 1 });

    const { result } = renderHook(() => useRecommendations({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.runNow(["PLTR", "AMD"]);
    });

    expect(recommendationsApi.run).toHaveBeenCalledWith(["PLTR", "AMD"]);
  });

  it("runNow surfaces a rejection as actionError and rethrows", async () => {
    mockHappyPath();
    recommendationsApi.run.mockRejectedValue(new Error("Engine failed."));

    const { result } = renderHook(() => useRecommendations({ autoRefresh: false }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(result.current.runNow()).rejects.toThrow("Engine failed.");
    });

    expect(result.current.actionError).toBe("Engine failed.");
  });
});
