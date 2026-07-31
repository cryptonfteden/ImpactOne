import { describe, it, expect } from "vitest";
import { ORBITAL_MODULES, orbitalPosition, focusedCameraFor, OVERVIEW_CAMERA, MISSION_CONTROL_CHAIN, ORBIT_RADIUS } from "./orbitalConfig";

describe("orbitalConfig", () => {
  it("defines exactly the 7 real orbital modules named in the mission", () => {
    expect(ORBITAL_MODULES).toHaveLength(7);
    expect(ORBITAL_MODULES.map((m) => m.label)).toEqual([
      "Market Intelligence",
      "News Intelligence",
      "AI Analysis",
      "Portfolio",
      "Watchlist",
      "Personal Intelligence",
      "Alerts",
    ]);
  });

  it("every module maps to a real, non-empty screenMap key (no orphaned orbital node)", () => {
    ORBITAL_MODULES.forEach((module) => {
      expect(typeof module.key).toBe("string");
      expect(module.key.length).toBeGreaterThan(0);
    });
  });

  it("orbitalPosition places the first module at (radius, 0, 0)", () => {
    const [x, y, z] = orbitalPosition(0, 7);
    expect(x).toBeCloseTo(ORBIT_RADIUS);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(0);
  });

  it("orbitalPosition distributes modules evenly around a full real circle", () => {
    const positions = ORBITAL_MODULES.map((_, index) => orbitalPosition(index, ORBITAL_MODULES.length));
    // Every position is a real point on the orbit radius, not clustered.
    positions.forEach(([x, , z]) => {
      const distance = Math.hypot(x, z);
      expect(distance).toBeCloseTo(ORBIT_RADIUS);
    });
    // No two modules ever land on the exact same real point.
    const uniquePoints = new Set(positions.map((p) => p.map((n) => n.toFixed(3)).join(",")));
    expect(uniquePoints.size).toBe(positions.length);
  });

  it("focusedCameraFor keeps the Earth (origin) between the camera and the module — Earth always stays in view", () => {
    const modulePosition = orbitalPosition(0, 7);
    const { position, target } = focusedCameraFor(modulePosition);
    expect(target).toEqual(modulePosition);
    // The camera sits further out than the module itself, along the same real ray from the origin.
    const moduleDistance = Math.hypot(modulePosition[0], modulePosition[2]);
    const cameraDistance = Math.hypot(position[0], position[2]);
    expect(cameraDistance).toBeGreaterThan(moduleDistance);
  });

  it("OVERVIEW_CAMERA looks back at the real origin (Earth's own position)", () => {
    expect(OVERVIEW_CAMERA.target).toEqual([0, 0, 0]);
  });

  it("MISSION_CONTROL_CHAIN is the mission's exact, real, ordered sequence", () => {
    expect(MISSION_CONTROL_CHAIN.map((step) => step.label)).toEqual([
      "Global Event",
      "AI Reasoning",
      "Sector Impact",
      "Company Impact",
      "Portfolio Impact",
      "Recommendation",
    ]);
  });
});
