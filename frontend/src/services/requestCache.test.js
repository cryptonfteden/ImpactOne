import { describe, expect, it, vi, beforeEach } from "vitest";
import { withRequestCache, clearRequestCache } from "./requestCache";

beforeEach(() => {
  clearRequestCache();
  vi.useRealTimers();
});

describe("requestCache", () => {
  it("returns the fetcher's resolved value on a fresh key", async () => {
    const fetcher = vi.fn().mockResolvedValue("real-data");
    const result = await withRequestCache("key-a", fetcher);
    expect(result).toBe("real-data");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates concurrent calls for the same key into one real fetch", async () => {
    let resolveFetch;
    const fetcher = vi.fn(() => new Promise((resolve) => { resolveFetch = resolve; }));

    const first = withRequestCache("key-b", fetcher);
    const second = withRequestCache("key-b", fetcher);
    resolveFetch("shared-result");

    expect(await first).toBe("shared-result");
    expect(await second).toBe("shared-result");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reuses the cached value within the TTL window without calling the fetcher again", async () => {
    const fetcher = vi.fn().mockResolvedValue("value-1");
    await withRequestCache("key-c", fetcher, { ttlMs: 10000 });
    await withRequestCache("key-c", fetcher, { ttlMs: 10000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("issues a fresh real fetch once the TTL has expired", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("value-1").mockResolvedValueOnce("value-2");
    const first = await withRequestCache("key-d", fetcher, { ttlMs: 5 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await withRequestCache("key-d", fetcher, { ttlMs: 5 });

    expect(first).toBe("value-1");
    expect(second).toBe("value-2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never caches a rejection — the next call gets a genuine retry", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce("recovered");

    await expect(withRequestCache("key-e", fetcher)).rejects.toThrow("down");
    const result = await withRequestCache("key-e", fetcher);

    expect(result).toBe("recovered");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clearRequestCache(key) only clears that one entry", async () => {
    const fetcherA = vi.fn().mockResolvedValue("a");
    const fetcherB = vi.fn().mockResolvedValue("b");
    await withRequestCache("key-f", fetcherA);
    await withRequestCache("key-g", fetcherB);

    clearRequestCache("key-f");

    await withRequestCache("key-f", fetcherA);
    await withRequestCache("key-g", fetcherB);

    expect(fetcherA).toHaveBeenCalledTimes(2);
    expect(fetcherB).toHaveBeenCalledTimes(1);
  });

  it("clearRequestCache() with no key clears everything", async () => {
    const fetcherA = vi.fn().mockResolvedValue("a");
    await withRequestCache("key-h", fetcherA);
    clearRequestCache();
    await withRequestCache("key-h", fetcherA);
    expect(fetcherA).toHaveBeenCalledTimes(2);
  });
});
