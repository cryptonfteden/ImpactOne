import { describe, expect, it } from "vitest";
import { relativeLuminance, contrastRatio, meetsWcagAA } from "./contrast";

describe("contrast", () => {
  it("computes real relative luminance for black and white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("computes a real, order-independent contrast ratio", () => {
    const ratio = contrastRatio("#ffffff", "#000000");
    expect(ratio).toBeCloseTo(21, 0);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(ratio, 5);
  });

  it("confirms the fixed text-tertiary token now passes AA on every real dark surface (TOKEN_REVIEW.md fix)", () => {
    const textTertiary = "#8894aa";
    const surfaces = ["#0a0e16", "#11151f", "#1a2030"];
    for (const surface of surfaces) {
      expect(meetsWcagAA(textTertiary, surface)).toBe(true);
    }
  });

  it("documents the original, pre-fix text-tertiary value as a real, reproducible AA failure", () => {
    const originalTextTertiary = "#6b7488";
    const worstCaseSurface = "#1a2030";
    expect(meetsWcagAA(originalTextTertiary, worstCaseSurface)).toBe(false);
  });

  it("large text has a lower real threshold than normal text", () => {
    // A ratio that fails normal-text AA (4.5) but passes large-text AA (3).
    const midGray = "#aaaaaa";
    const background = "#4a4a4a";
    const ratio = contrastRatio(midGray, background);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(4.5);
    expect(meetsWcagAA(midGray, background, { isLargeText: true })).toBe(true);
    expect(meetsWcagAA(midGray, background, { isLargeText: false })).toBe(false);
  });
});
