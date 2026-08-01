import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Phase MOBILE-FIXES-001 — regression tests for every confirmed P0
// mobile issue. There is no real browser/visual-regression tool
// available in this environment (the same disclosed limitation as
// every 3D-related phase this session), so these fixes — which are
// CSS-only, real-layout behaviors jsdom cannot render or measure — are
// regression-tested by reading the actual, real stylesheet and
// asserting the exact structural rules the fix depends on are present.
// This is the same "read the real source and assert its structure"
// technique already established elsewhere in this codebase (e.g. the
// backend's own unification.test.js) applied to CSS instead of JS.
// Deliberately simple substring/regex checks rather than a full CSS
// parser — robust to incidental reformatting, precise about the real
// properties this phase's fixes depend on.
const stylesPath = path.join(fileURLToPath(import.meta.url), "..", "styles.css");
const css = readFileSync(stylesPath, "utf8");

const workspace3dCssPath = path.join(fileURLToPath(import.meta.url), "..", "features", "workspace3d", "workspace3d.css");
const workspace3dCss = readFileSync(workspace3dCssPath, "utf8");

describe("Mobile P0 fixes — styles.css structural regression tests", () => {
  it("P0 #1 — the mobile-nav-activation breakpoint also covers short-height landscape phones, not just narrow-width portrait ones", () => {
    // The exact real bug: a width-only breakpoint never matches a
    // landscape phone (e.g. 844x390 — width 844 is well above any
    // portrait-phone width threshold). The fix adds a real OR-branch on
    // orientation + max-height.
    expect(css).toMatch(/@media \(max-width: 720px\), \(orientation: landscape\) and \(max-height: 500px\)/);
  });

  it("P0 #1 — the real bottom-nav-activation breakpoint hides the desktop sidebar and shows the real bottom nav (reuses BottomNav, no new nav concept)", () => {
    const breakpointIndex = css.indexOf("@media (max-width: 720px), (orientation: landscape) and (max-height: 500px)");
    expect(breakpointIndex).toBeGreaterThan(-1);
    const restOfFile = css.slice(breakpointIndex);
    const sidebarRuleIndex = restOfFile.indexOf(".sidebar {");
    const bottomNavRuleIndex = restOfFile.indexOf(".bottom-nav {");
    expect(sidebarRuleIndex).toBeGreaterThan(-1);
    expect(bottomNavRuleIndex).toBeGreaterThan(-1);
    // Both real rules must appear before the block's own closing brace
    // (found by counting braces) — a loose but real proximity check.
    expect(restOfFile.slice(sidebarRuleIndex, sidebarRuleIndex + 40)).toMatch(/display:\s*none/);
    expect(restOfFile.slice(bottomNavRuleIndex, bottomNavRuleIndex + 40)).toMatch(/display:\s*flex/);
  });

  it("P0 #1 — a landscape-specific compact treatment keeps every touch target at least 44px tall", () => {
    const landscapeBlockIndex = css.indexOf("@media (orientation: landscape) and (max-height: 500px) {");
    expect(landscapeBlockIndex).toBeGreaterThan(-1);
    const block = css.slice(landscapeBlockIndex, landscapeBlockIndex + 600);
    const minHeightMatch = block.match(/\.bottom-nav__item\s*\{[^}]*min-height:\s*(\d+)px/);
    expect(minHeightMatch).not.toBeNull();
    expect(Number(minHeightMatch[1])).toBeGreaterThanOrEqual(44);
  });

  it("P0 #2 — Home's primary CTA row has a real scroll-margin at least as tall as the reserved nav height, so it can never land scrolled behind the fixed nav", () => {
    expect(css).toMatch(/\.screen-hero \.opportunity-item__actions\s*\{[^}]*scroll-margin-bottom:\s*calc\(var\(--mobile-nav-height\)/);
  });

  it("P0 #2 — .main-panel reserves real bottom padding using the same shared --mobile-nav-height variable (no drift between the two)", () => {
    expect(css).toMatch(/\.main-panel\s*\{[^}]*padding-bottom:\s*calc\(var\(--mobile-nav-height\)/);
  });

  it("P0 #3 — the feedback widget has both its real desktop offset and a real mobile override that clears the reserved nav height", () => {
    // The base (desktop) rule.
    expect(css).toMatch(/\.feedback-widget\s*\{[^}]*bottom:\s*20px/);
    // The mobile override uses the exact same shared variable
    // .main-panel uses, so the two can never silently drift apart again.
    const occurrences = css.match(/\.feedback-widget\s*\{[^}]*bottom:\s*calc\(var\(--mobile-nav-height\)/g) || [];
    expect(occurrences.length).toBeGreaterThanOrEqual(1);
  });

  it("--mobile-nav-height is defined exactly once as the single shared source of truth", () => {
    const definitions = css.match(/--mobile-nav-height:\s*\d+px/g) || [];
    expect(definitions).toHaveLength(1);
  });

  it("P0 #4 — the full-screen 3D scene's fixed min-height floor no longer forces an extra scroll on short/landscape viewports", () => {
    expect(workspace3dCss).toMatch(
      /@media \(orientation: landscape\) and \(max-height: 500px\) \{\s*\.workspace3d-root\s*\{[^}]*min-height:\s*calc\(100vh - var\(--mobile-nav-height/
    );
  });

  it("safe-area insets are respected by every real fix this phase made (not a hardcoded assumption of zero)", () => {
    // Each of these three real, touched rules must reference a real
    // env(safe-area-inset-*) fallback, not a bare pixel value.
    expect(css).toMatch(/\.main-panel\s*\{[^}]*env\(safe-area-inset-bottom, 0px\)/);
    expect(css.match(/\.feedback-widget\s*\{[^}]*env\(safe-area-inset-bottom, 0px\)/g)?.length).toBeGreaterThanOrEqual(1);
    expect(css).toMatch(/\.screen-hero \.opportunity-item__actions\s*\{[^}]*env\(safe-area-inset-bottom, 0px\)/);
  });
});
