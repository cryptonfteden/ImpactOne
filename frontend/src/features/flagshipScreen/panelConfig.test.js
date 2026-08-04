import { describe, it, expect } from "vitest";
import { FLAGSHIP_PANELS, flagshipPanelPosition, flagshipFocusedCamera, FLAGSHIP_RADIUS, FLAGSHIP_PORTFOLIO_PANEL_INDEX } from "./panelConfig";

describe("flagshipScreen/panelConfig", () => {
  it("defines exactly the 10 real required panels, in the mission's own order", () => {
    expect(FLAGSHIP_PANELS).toHaveLength(10);
    expect(FLAGSHIP_PANELS.map((p) => p.label)).toEqual([
      "AI Market Summary",
      "Global Events",
      "Portfolio Health",
      "AI Recommendations",
      "Watchlist",
      "Fear & Greed",
      "Agent Consensus",
      "Macro Calendar",
      "Breaking News",
      "Alerts",
    ]);
  });

  it("every panel has a unique, non-empty key", () => {
    const keys = FLAGSHIP_PANELS.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach((key) => expect(key.length).toBeGreaterThan(0));
  });

  it("positions every panel on the real flagship orbit radius, all distinct", () => {
    const positions = FLAGSHIP_PANELS.map((_, index) => flagshipPanelPosition(index));
    positions.forEach(([x, , z]) => {
      expect(Math.hypot(x, z)).toBeCloseTo(FLAGSHIP_RADIUS);
    });
    const unique = new Set(positions.map((p) => p.map((n) => n.toFixed(3)).join(",")));
    expect(unique.size).toBe(positions.length);
  });

  it("focusedCamera for any panel keeps the Earth between the camera and the panel", () => {
    FLAGSHIP_PANELS.forEach((_, index) => {
      const { position, target } = flagshipFocusedCamera(index);
      const panelPosition = flagshipPanelPosition(index);
      expect(target).toEqual(panelPosition);
      const panelDistance = Math.hypot(panelPosition[0], panelPosition[2]);
      const cameraDistance = Math.hypot(position[0], position[2]);
      expect(cameraDistance).toBeGreaterThan(panelDistance);
    });
  });

  it("locates the real Portfolio Health panel's index (used for holding connections)", () => {
    expect(FLAGSHIP_PANELS[FLAGSHIP_PORTFOLIO_PANEL_INDEX].key).toBe("portfolioHealth");
  });
});
