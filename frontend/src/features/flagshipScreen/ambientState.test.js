import { describe, it, expect } from "vitest";
import { computeAmbientState, NEUTRAL_AMBIENT_STATE } from "./ambientState";

function panelsFixture({ portfolio, events } = {}) {
  return {
    portfolioHealth: portfolio ? { status: "live", data: portfolio } : { status: "loading", data: null },
    globalEvents: events ? { status: "live", data: events } : { status: "loading", data: [] },
  };
}

describe("ambientState.computeAmbientState", () => {
  it("is honestly neutral with no real live data yet", () => {
    const state = computeAmbientState(panelsFixture());
    expect(state.tone).toBe("neutral");
    expect(state.color).toBe(NEUTRAL_AMBIENT_STATE.color);
  });

  it("reads a real, positive portfolio change as bullish", () => {
    const state = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: 2.5 } }));
    expect(state.tone).toBe("bullish");
    expect(state.color).toBe("#4fffb0");
  });

  it("reads a real, negative portfolio change as bearish", () => {
    const state = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: -3.1 } }));
    expect(state.tone).toBe("bearish");
    expect(state.color).toBe("#ff5f5f");
  });

  it("a real change within a small neutral band around zero stays neutral", () => {
    const state = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: 0.01 } }));
    expect(state.tone).toBe("neutral");
  });

  it("intensity scales up with a real, larger portfolio move", () => {
    const small = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: 0.5 } }));
    const large = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: 4 } }));
    expect(large.intensity).toBeGreaterThan(small.intensity);
  });

  it("intensity scales up with a real, larger count of active global events", () => {
    const few = computeAmbientState(panelsFixture({ events: [{}, {}] }));
    const many = computeAmbientState(panelsFixture({ events: Array.from({ length: 8 }) }));
    expect(many.intensity).toBeGreaterThan(few.intensity);
  });

  it("intensity is always a real, finite value in [0, 1]", () => {
    const state = computeAmbientState(panelsFixture({ portfolio: { hasComparison: true, valueChangePct: 999 }, events: Array.from({ length: 999 }) }));
    expect(state.intensity).toBeGreaterThanOrEqual(0);
    expect(state.intensity).toBeLessThanOrEqual(1);
  });

  it("handles genuinely missing/undefined panel data without throwing", () => {
    expect(() => computeAmbientState({})).not.toThrow();
    expect(() => computeAmbientState(undefined)).not.toThrow();
  });
});
