import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { startVisibilityAwarePolling } from "./pollWhileVisible";

function setVisibility(state) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
}

describe("startVisibilityAwarePolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invokes the callback on each interval tick while the document is visible", () => {
    const callback = vi.fn();
    const stop = startVisibilityAwarePolling(callback, 1000);

    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(3);

    stop();
  });

  it("skips interval ticks while the document is hidden", () => {
    const callback = vi.fn();
    setVisibility("hidden");
    const stop = startVisibilityAwarePolling(callback, 1000);

    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();

    stop();
  });

  it("re-invokes the callback immediately when the tab becomes visible again", () => {
    const callback = vi.fn();
    setVisibility("hidden");
    const stop = startVisibilityAwarePolling(callback, 1000);

    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(callback).toHaveBeenCalledTimes(1);

    stop();
  });

  it("stops both the interval and the visibilitychange listener once cleaned up", () => {
    const callback = vi.fn();
    const stop = startVisibilityAwarePolling(callback, 1000);
    stop();

    vi.advanceTimersByTime(5000);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(callback).not.toHaveBeenCalled();
  });
});
