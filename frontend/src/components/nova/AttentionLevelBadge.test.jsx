import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AttentionLevelBadge, { attentionLevelTone } from "./AttentionLevelBadge";

describe("AttentionLevelBadge", () => {
  it.each(["High", "Medium", "Low"])(
    "always uses the one fixed, exclusive 'attention' tone for level %s — never Confidence's or Status's banded tones (PRODUCT_STYLE_GAPS.md, H1)",
    (level) => {
      expect(attentionLevelTone(level)).toBe("attention");
    }
  );

  it("renders the consistent 'Attention: {level}' label with the fixed attention tone", () => {
    render(<AttentionLevelBadge level="High" />);
    const badge = screen.getByText("Attention: High");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-tone", "attention");
  });

  it("never renders the same tone Confidence bands or claim status badges use for a different real signal", () => {
    // A High attention level must not collide with confidenceBand's
    // "warning" (Moderate confidence) or a claim status badge's
    // "warning" (Weakening) — this is the exact bug this fix closes.
    render(<AttentionLevelBadge level="High" />);
    expect(screen.getByText("Attention: High")).not.toHaveAttribute("data-tone", "warning");
  });
});
