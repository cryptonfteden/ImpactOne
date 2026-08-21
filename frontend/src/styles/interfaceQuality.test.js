import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const css = readFileSync(path.join(root, "interface-quality.css"), "utf8");
const entry = readFileSync(path.join(root, "..", "main.jsx"), "utf8");

describe("cross-screen interface quality guardrails", () => {
  it("loads after the existing accessibility foundation", () => {
    expect(entry.indexOf('./styles/interface-quality.css')).toBeGreaterThan(entry.indexOf('./styles/accessibility.css'));
  });

  it("keeps keyboard focus, touch targets, dialogs and reduced motion accessible", () => {
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/min-height:44px/);
    expect(css).toMatch(/max-height:90dvh/);
    expect(css).toMatch(/prefers-reduced-motion:reduce/);
  });

  it.each(["760px", "900px", "620px"])("contains a responsive guardrail at %s", (viewport) => {
    expect(css).toContain(viewport);
  });

  it("provides workspace skeletons and a responsive source-status grid", () => {
    expect(css).toMatch(/screen-loading-state__grid/);
    expect(css).toMatch(/source-status-grid/);
    expect(css).toMatch(/grid-template-columns:1fr/);
  });
});
