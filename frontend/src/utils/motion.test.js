import { describe, expect, it, afterEach, vi } from "vitest";
import { MOTION_DURATION_MS, MOTION_CURVE, prefersReducedMotion, resolveDurationMs } from "./motion";

afterEach(() => {
  document.documentElement.removeAttribute("data-motion");
  vi.restoreAllMocks();
});

describe("motion tokens", () => {
  it("exposes the real, documented duration values (matches tokens.css)", () => {
    expect(MOTION_DURATION_MS.micro).toBe(120);
    expect(MOTION_DURATION_MS.standard).toBe(200);
    expect(MOTION_DURATION_MS.screen).toBe(320);
    expect(MOTION_DURATION_MS.aiThinkingLoop).toBe(1800);
  });

  it("exposes the real curve strings (matches tokens.css)", () => {
    expect(MOTION_CURVE.enter).toBe("cubic-bezier(0.16, 1, 0.3, 1)");
    expect(MOTION_CURVE.exit).toBe("cubic-bezier(0.4, 0, 1, 1)");
  });
});

describe("prefersReducedMotion", () => {
  it("is false by default (no data-motion attribute, no matchMedia match)", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(prefersReducedMotion()).toBe(false);
  });

  it("honors the explicit in-app override (data-motion='reduced') regardless of OS setting", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    document.documentElement.setAttribute("data-motion", "reduced");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("honors the real OS-level prefers-reduced-motion signal", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe("resolveDurationMs", () => {
  it("returns the real duration when motion is not reduced", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(resolveDurationMs(200)).toBe(200);
  });

  it("returns 0 when motion is reduced, so callers can skip straight to the end state", () => {
    document.documentElement.setAttribute("data-motion", "reduced");
    expect(resolveDurationMs(200)).toBe(0);
  });
});
