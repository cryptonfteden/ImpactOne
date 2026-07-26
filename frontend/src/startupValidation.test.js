import { describe, expect, it } from "vitest";
import { validateScreenMap, validateRequiredModules, runStartupValidation } from "./startupValidation";

function RealComponent() {
  return null;
}

describe("validateScreenMap", () => {
  it("passes when every screen resolves to a real component and every nav key has a screen", () => {
    const issues = validateScreenMap({ Home: RealComponent, Portfolio: RealComponent }, ["Home", "Portfolio"]);
    expect(issues).toEqual([]);
  });

  it("flags a screenMap entry that resolved to undefined — a broken import/export", () => {
    const issues = validateScreenMap({ Home: RealComponent, Broken: undefined }, ["Home"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].key).toBe("Broken");
  });

  it("flags a nav item with no matching screenMap entry — a dead end", () => {
    const issues = validateScreenMap({ Home: RealComponent }, ["Home", "Ghost"]);
    expect(issues).toHaveLength(1);
    expect(issues[0].key).toBe("Ghost");
  });

  it("accepts a React.lazy-shaped object (has $$typeof) as a valid component", () => {
    const lazyLike = { $$typeof: Symbol.for("react.lazy") };
    const issues = validateScreenMap({ Lazy: lazyLike }, []);
    expect(issues).toEqual([]);
  });
});

describe("validateRequiredModules", () => {
  it("passes when every required module is present", () => {
    const issues = validateRequiredModules({ apiClient: {}, i18n: {} });
    expect(issues).toEqual([]);
  });

  it("flags a missing (undefined) required module by real name", () => {
    const issues = validateRequiredModules({ apiClient: {}, brokenProvider: undefined });
    expect(issues).toHaveLength(1);
    expect(issues[0].key).toBe("brokenProvider");
  });

  it("flags a null required module", () => {
    const issues = validateRequiredModules({ thing: null });
    expect(issues).toHaveLength(1);
  });
});

describe("runStartupValidation", () => {
  it("combines screenMap and module issues into one real report", () => {
    const result = runStartupValidation({
      screenMap: { Home: RealComponent },
      navigableKeys: ["Home", "Ghost"],
      requiredModules: { apiClient: undefined },
    });
    expect(result.ok).toBe(false);
    expect(result.issues).toHaveLength(2);
  });

  it("reports ok: true with zero issues when everything is real", () => {
    const result = runStartupValidation({
      screenMap: { Home: RealComponent },
      navigableKeys: ["Home"],
      requiredModules: { apiClient: {} },
    });
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });
});
