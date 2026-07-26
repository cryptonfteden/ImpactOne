// Phase X12B — NOVA Foundation, Part 7: Accessibility Foundation.
//
// A real, computed WCAG contrast checker — TOKEN_REVIEW.md's finding #3
// caught a real contrast failure by hand-computing relative luminance;
// this is that same math, made reusable so the next token addition can
// be checked by a test (see contrast.test.js) instead of by eye.
function hexToLinearChannel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex) {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return 0.2126 * hexToLinearChannel(r) + 0.7152 * hexToLinearChannel(g) + 0.0722 * hexToLinearChannel(b);
}

// The real WCAG 2.1 contrast-ratio formula — order of the two colors
// doesn't matter, the lighter one is always resolved as L1 internally.
export function contrastRatio(hexA, hexB) {
  const luminanceA = relativeLuminance(hexA);
  const luminanceB = relativeLuminance(hexB);
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1 AA thresholds: 4.5:1 for normal text, 3:1 for large text
// (>=24px, or >=19px bold) and for non-text UI components/graphics.
export function meetsWcagAA(hexA, hexB, { isLargeText = false } = {}) {
  const ratio = contrastRatio(hexA, hexB);
  return ratio >= (isLargeText ? 3 : 4.5);
}
