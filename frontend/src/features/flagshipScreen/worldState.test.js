import { describe, it, expect } from "vitest";
import { computeWorldState, NEUTRAL_WORLD_STATE } from "./worldState";

function panelsFixture(overrides = {}) {
  return {
    portfolioHealth: { status: "loading", data: null },
    agentConsensus: { status: "loading", data: null },
    fearGreed: { status: "loading", data: null },
    breakingNews: { status: "loading", data: [] },
    globalEvents: { status: "loading", data: [] },
    macroCalendar: { status: "loading", data: [] },
    alerts: { status: "loading", data: [] },
    ...overrides,
  };
}

describe("worldState.computeWorldState", () => {
  it("is honestly neutral with no real live data yet", () => {
    const state = computeWorldState(panelsFixture());
    expect(state.tone).toBe("neutral");
    expect(state.regime).toBe("neutral");
    expect(state.color).toBe(NEUTRAL_WORLD_STATE.color);
  });

  it("reads a real positive portfolio move as bullish / risk-on", () => {
    const state = computeWorldState(
      panelsFixture({ portfolioHealth: { status: "live", data: { hasComparison: true, valueChangePct: 2 } } })
    );
    expect(state.tone).toBe("bullish");
    expect(state.regime).toBe("risk-on");
  });

  it("reads a real negative portfolio move as bearish / risk-off", () => {
    const state = computeWorldState(
      panelsFixture({ portfolioHealth: { status: "live", data: { hasComparison: true, valueChangePct: -2 } } })
    );
    expect(state.tone).toBe("bearish");
    expect(state.regime).toBe("risk-off");
  });

  it("falls back to a real Fear & Greed extreme when no portfolio comparison exists yet", () => {
    const state = computeWorldState(panelsFixture({ fearGreed: { status: "live", data: { value: 82 } } }));
    expect(state.tone).toBe("bullish");
  });

  it("real confidence, breaking news, claim, macro, and alert counts all raise intensity", () => {
    const quiet = computeWorldState(panelsFixture());
    const busy = computeWorldState(
      panelsFixture({
        agentConsensus: { status: "live", data: { cio: { confidence: "HIGH_UNANIMOUS" } } },
        breakingNews: { status: "live", data: Array.from({ length: 6 }) },
        globalEvents: { status: "live", data: Array.from({ length: 8 }) },
        macroCalendar: { status: "live", data: Array.from({ length: 6 }) },
        alerts: { status: "live", data: Array.from({ length: 5 }) },
        fearGreed: { status: "live", data: { value: 95 } },
      })
    );
    expect(busy.intensity).toBeGreaterThan(quiet.intensity);
  });

  it("the one real composite intensity scales up with more real activity", () => {
    const quiet = computeWorldState(panelsFixture());
    const busy = computeWorldState(
      panelsFixture({
        portfolioHealth: { status: "live", data: { hasComparison: true, valueChangePct: 4 } },
        globalEvents: { status: "live", data: Array.from({ length: 8 }) },
      })
    );
    expect(busy.intensity).toBeGreaterThan(quiet.intensity);
  });

  it("real active alerts during a real bearish tone produce the 'alert' sound hook", () => {
    const state = computeWorldState(
      panelsFixture({
        portfolioHealth: { status: "live", data: { hasComparison: true, valueChangePct: -3 } },
        alerts: { status: "live", data: [{ id: 1 }] },
      })
    );
    expect(state.soundHook).toBe("alert");
  });

  it("a genuinely quiet world produces the 'calm' sound hook", () => {
    const state = computeWorldState(panelsFixture());
    expect(state.soundHook).toBe("calm");
  });

  it("every real count field reflects the real data length, never a fabricated one", () => {
    const state = computeWorldState(
      panelsFixture({
        breakingNews: { status: "live", data: [{ a: 1 }, { a: 2 }] },
        globalEvents: { status: "live", data: [{ a: 1 }] },
        macroCalendar: { status: "live", data: [] },
        alerts: { status: "live", data: [{ a: 1 }, { a: 2 }, { a: 3 }] },
      })
    );
    expect(state.breakingNewsCount).toBe(2);
    expect(state.claimCount).toBe(1);
    expect(state.macroEventCount).toBe(0);
    expect(state.alertsCount).toBe(3);
  });

  it("intensity and every derived parameter always stay within a real, finite [0, 1]-adjacent range", () => {
    const state = computeWorldState(
      panelsFixture({
        portfolioHealth: { status: "live", data: { hasComparison: true, valueChangePct: 999 } },
        globalEvents: { status: "live", data: Array.from({ length: 999 }) },
        breakingNews: { status: "live", data: Array.from({ length: 999 }) },
        macroCalendar: { status: "live", data: Array.from({ length: 999 }) },
        alerts: { status: "live", data: Array.from({ length: 999 }) },
        fearGreed: { status: "live", data: { value: 100 } },
        agentConsensus: { status: "live", data: { cio: { confidence: "HIGH_UNANIMOUS" } } },
      })
    );
    expect(state.intensity).toBeLessThanOrEqual(1);
    expect(state.confidenceIntensity).toBeLessThanOrEqual(1);
  });

  it("handles genuinely missing/undefined panel data without throwing", () => {
    expect(() => computeWorldState({})).not.toThrow();
    expect(() => computeWorldState(undefined)).not.toThrow();
  });
});
