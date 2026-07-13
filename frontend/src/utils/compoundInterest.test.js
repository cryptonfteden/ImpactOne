import { describe, expect, it } from "vitest";
import { computeFutureValue } from "./compoundInterest";

describe("computeFutureValue", () => {
  it("returns zero growth with a 0% return (future value equals total contributed)", () => {
    const result = computeFutureValue({ monthlyContribution: 100, annualReturnPct: 0, years: 5 });
    expect(result.totalContributed).toBe(6000);
    expect(result.futureValue).toBe(6000);
    expect(result.totalGrowth).toBe(0);
  });

  it("produces growth greater than total contributed with a positive return", () => {
    const result = computeFutureValue({ monthlyContribution: 500, annualReturnPct: 8, years: 20 });
    expect(result.totalContributed).toBe(120000);
    expect(result.futureValue).toBeGreaterThan(result.totalContributed);
    expect(result.totalGrowth).toBeCloseTo(result.futureValue - result.totalContributed, 2);
  });

  it("produces exactly one yearly balance entry per year, plus year 0", () => {
    const result = computeFutureValue({ monthlyContribution: 100, annualReturnPct: 5, years: 10 });
    expect(result.yearlyBalances).toHaveLength(11);
    expect(result.yearlyBalances[0]).toEqual({ year: 0, balance: 0, contributed: 0 });
    expect(result.yearlyBalances[10].year).toBe(10);
  });

  it("gracefully handles zero/missing inputs without throwing", () => {
    const result = computeFutureValue({});
    expect(result.futureValue).toBe(0);
    expect(result.yearlyBalances).toHaveLength(1);
  });

  it("a higher monthly contribution always produces a higher future value, all else equal", () => {
    const low = computeFutureValue({ monthlyContribution: 100, annualReturnPct: 6, years: 15 });
    const high = computeFutureValue({ monthlyContribution: 500, annualReturnPct: 6, years: 15 });
    expect(high.futureValue).toBeGreaterThan(low.futureValue);
  });
});
