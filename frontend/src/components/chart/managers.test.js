import { describe, expect, it } from "vitest";
import { DrawingManager, OverlayManager, IndicatorManager, ToolManager } from "./managers";
import { OVERLAY_REGISTRY } from "./overlayRegistry";

describe("DrawingManager", () => {
  it("adds and lists real drawings with a real generated id", () => {
    const manager = new DrawingManager();
    const id = manager.addDrawing("USER_DRAWING", { points: [1, 2, 3] });
    expect(manager.list().length).toBe(1);
    expect(manager.list()[0].id).toBe(id);
  });

  it("removes a real drawing by id", () => {
    const manager = new DrawingManager();
    const id = manager.addDrawing("USER_DRAWING", {});
    expect(manager.removeDrawing(id)).toBe(true);
    expect(manager.list().length).toBe(0);
  });

  it("clear() removes every real drawing", () => {
    const manager = new DrawingManager();
    manager.addDrawing("USER_DRAWING", {});
    manager.addDrawing("USER_DRAWING", {});
    manager.clear();
    expect(manager.list().length).toBe(0);
  });
});

describe("OverlayManager", () => {
  it("rejects activating an unknown overlay — never silently no-ops", () => {
    const manager = new OverlayManager(OVERLAY_REGISTRY);
    expect(() => manager.activate("NOT_REAL")).toThrow(/Unknown overlay/);
  });

  it("rejects activating a real but not-yet-implemented overlay (e.g. FIBONACCI) — honest, not fabricated", () => {
    const manager = new OverlayManager(OVERLAY_REGISTRY);
    expect(() => manager.activate("FIBONACCI")).toThrow(/architecture-only/);
    expect(() => manager.activate("SMA")).toThrow(/architecture-only/);
  });

  it("hot-plug: activating an overlay registered moments ago (implemented: true) works immediately, no chart restart", () => {
    const registry = { CUSTOM: { label: "Custom", implemented: true } };
    const manager = new OverlayManager(registry);
    manager.activate("CUSTOM");
    expect(manager.isActive("CUSTOM")).toBe(true);
    expect(manager.listActive()).toEqual(["CUSTOM"]);
  });

  it("deactivate removes a real active overlay", () => {
    const registry = { CUSTOM: { label: "Custom", implemented: true } };
    const manager = new OverlayManager(registry);
    manager.activate("CUSTOM");
    manager.deactivate("CUSTOM");
    expect(manager.isActive("CUSTOM")).toBe(false);
  });
});

describe("IndicatorManager", () => {
  it("registers a real indicator profile with real compute/render functions", () => {
    const manager = new IndicatorManager();
    manager.registerIndicatorProfile("SMA", { compute: () => [], render: () => {} });
    expect(manager.list()).toEqual(["SMA"]);
    expect(typeof manager.get("SMA").compute).toBe("function");
  });

  it("rejects a profile missing a real compute or render function — never accepts a fake indicator", () => {
    const manager = new IndicatorManager();
    expect(() => manager.registerIndicatorProfile("BAD", { compute: () => [] })).toThrow(/must provide real compute/);
    expect(() => manager.registerIndicatorProfile("BAD2", {})).toThrow(/must provide real compute/);
  });

  it("unregister removes a real profile", () => {
    const manager = new IndicatorManager();
    manager.registerIndicatorProfile("SMA", { compute: () => [], render: () => {} });
    expect(manager.unregister("SMA")).toBe(true);
    expect(manager.list()).toEqual([]);
  });
});

describe("ToolManager", () => {
  it("composes all three real managers behind one entry point", () => {
    const toolManager = new ToolManager(OVERLAY_REGISTRY);
    expect(toolManager.drawings).toBeInstanceOf(DrawingManager);
    expect(toolManager.overlays).toBeInstanceOf(OverlayManager);
    expect(toolManager.indicators).toBeInstanceOf(IndicatorManager);
  });

  it("loadCustomProfile is the real hot-plug entry point for a future indicator", () => {
    const toolManager = new ToolManager(OVERLAY_REGISTRY);
    toolManager.loadCustomProfile("CUSTOM_INDICATOR", { compute: () => [], render: () => {} });
    expect(toolManager.indicators.list()).toContain("CUSTOM_INDICATOR");
  });
});
