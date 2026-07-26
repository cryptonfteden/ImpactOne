import { describe, expect, it } from "vitest";
import { OVERLAY_REGISTRY, getOverlay, listOverlays, isOverlayReady } from "./overlayRegistry";

describe("overlayRegistry", () => {
  it("registers every overlay the mission names, none implemented yet", () => {
    const required = ["SMA", "EMA", "VWAP", "RSI", "MACD", "AI_SIGNALS", "NEWS_EVENTS", "EARNINGS", "FIBONACCI", "USER_DRAWING"];
    for (const id of required) {
      expect(OVERLAY_REGISTRY[id]).toBeTruthy();
      expect(isOverlayReady(id)).toBe(false);
    }
  });

  it("FIBONACCI is explicitly marked pending CEO approval, not just unimplemented", () => {
    expect(getOverlay("FIBONACCI").pendingApproval).toBe(true);
  });

  it("listOverlays returns every registered overlay with a real label", () => {
    const overlays = listOverlays();
    expect(overlays.length).toBeGreaterThanOrEqual(10);
    for (const overlay of overlays) {
      expect(typeof overlay.label).toBe("string");
      expect(overlay.label.length).toBeGreaterThan(0);
    }
  });

  it("getOverlay returns null for an unregistered id — never a fabricated fallback", () => {
    expect(getOverlay("NOT_REAL")).toBe(null);
  });
});
