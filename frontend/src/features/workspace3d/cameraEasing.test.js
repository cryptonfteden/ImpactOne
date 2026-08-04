import { describe, it, expect } from "vitest";
import { easeInOutCubic, cameraGoalKey, TRANSITION_DURATION_S } from "./cameraEasing";

describe("cameraEasing", () => {
  it("easeInOutCubic starts at 0 and ends at 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it("easeInOutCubic is monotonically increasing across the real 0..1 range", () => {
    let previous = -Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const value = easeInOutCubic(t);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("easeInOutCubic is slower at the edges than a real linear pace (the 'cinematic' ease-in-out shape)", () => {
    // At t=0.1 (near the start), eased progress should lag behind linear.
    expect(easeInOutCubic(0.1)).toBeLessThan(0.1);
    // At t=0.9 (near the end), eased progress should lead linear (it's already caught up/ahead).
    expect(easeInOutCubic(0.9)).toBeGreaterThan(0.9);
  });

  it("easeInOutCubic clamps out-of-range input rather than extrapolating", () => {
    expect(easeInOutCubic(-1)).toBe(0);
    expect(easeInOutCubic(2)).toBe(1);
  });

  it("cameraGoalKey gives identical real keys for identical, freshly-constructed goal objects", () => {
    const a = { position: [1, 2, 3], target: [0, 0, 0] };
    const b = { position: [1, 2, 3], target: [0, 0, 0] };
    expect(cameraGoalKey(a)).toBe(cameraGoalKey(b));
  });

  it("cameraGoalKey gives distinct real keys for distinct goals", () => {
    const a = { position: [1, 2, 3], target: [0, 0, 0] };
    const b = { position: [4, 5, 6], target: [0, 0, 0] };
    expect(cameraGoalKey(a)).not.toBe(cameraGoalKey(b));
  });

  it("TRANSITION_DURATION_S is a real, positive, cinematic-scale duration (not instant, not sluggish)", () => {
    expect(TRANSITION_DURATION_S).toBeGreaterThan(0.3);
    expect(TRANSITION_DURATION_S).toBeLessThan(2);
  });
});
