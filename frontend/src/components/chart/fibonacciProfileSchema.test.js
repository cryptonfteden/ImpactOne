import { describe, expect, it } from "vitest";
import { isValidFibonacciProfile, FIBONACCI_EXTENSION_STATUS } from "./fibonacciProfileSchema";

const VALID_LEVEL = { ratio: 0.618, label: "61.8%", color: "#6fb6ff", lineStyle: "solid", visible: true };

describe("fibonacciProfileSchema", () => {
  it("Fibonacci is explicitly not implemented and pending CEO approval", () => {
    expect(FIBONACCI_EXTENSION_STATUS.implemented).toBe(false);
    expect(FIBONACCI_EXTENSION_STATUS.pendingApproval).toBe(true);
    expect(FIBONACCI_EXTENSION_STATUS.blockedOn).toMatch(/CEO approval/);
  });

  it("validates a real, complete profile shape", () => {
    const profile = { id: "standard", name: "Standard", levels: [VALID_LEVEL], extensions: [], retracements: [] };
    expect(isValidFibonacciProfile(profile)).toBe(true);
  });

  it("rejects a profile missing required fields", () => {
    expect(isValidFibonacciProfile({ id: "x" })).toBe(false);
    expect(isValidFibonacciProfile(null)).toBe(false);
    expect(isValidFibonacciProfile({ id: "x", name: "X", levels: "not-an-array", extensions: [], retracements: [] })).toBe(false);
  });

  it("rejects a level with an invalid lineStyle — never silently accepts malformed data", () => {
    const badLevel = { ...VALID_LEVEL, lineStyle: "squiggly" };
    const profile = { id: "x", name: "X", levels: [badLevel], extensions: [], retracements: [] };
    expect(isValidFibonacciProfile(profile)).toBe(false);
  });

  it("supports multiple profiles being loaded, per the architecture", () => {
    const a = { id: "a", name: "A", levels: [VALID_LEVEL], extensions: [], retracements: [] };
    const b = { id: "b", name: "B", levels: [VALID_LEVEL], extensions: [], retracements: [] };
    expect(isValidFibonacciProfile(a)).toBe(true);
    expect(isValidFibonacciProfile(b)).toBe(true);
    expect(a.id).not.toBe(b.id);
  });
});
