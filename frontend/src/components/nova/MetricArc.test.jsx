import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricArc from "./MetricArc";

describe("MetricArc — Phase MISSION-CONTROL-002 (metric independence audit)", () => {
  describe("confidence", () => {
    it("labels itself Confidence and includes the real confidence band", () => {
      render(<MetricArc score={82} metric="confidence" />);
      expect(screen.getByRole("img", { name: "Confidence 82 out of 100 — High" })).toBeInTheDocument();
    });

    it("never fabricates a score — an absent score renders an honest, metric-specific unavailable label", () => {
      render(<MetricArc score={undefined} metric="confidence" showValue />);
      expect(screen.getByText("—")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "Confidence not yet available" })).toBeInTheDocument();
    });
  });

  describe("attention", () => {
    it("labels itself Attention, never Confidence, for the exact same numeric score", () => {
      render(<MetricArc score={82} metric="attention" />);
      expect(screen.getByRole("img", { name: "Attention 82 out of 100" })).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /Confidence/ })).not.toBeInTheDocument();
    });

    it("renders in the fixed Attention hue, never Confidence's positive/warning/neutral band colors", () => {
      const { container: lowScoreContainer } = render(<MetricArc score={10} metric="attention" />);
      const { container: highScoreContainer } = render(<MetricArc score={95} metric="attention" />);
      const lowFill = lowScoreContainer.querySelector(".nova-metric-arc__fill").getAttribute("stroke");
      const highFill = highScoreContainer.querySelector(".nova-metric-arc__fill").getAttribute("stroke");
      // Same fixed brand-signal hue regardless of score magnitude — Attention
      // is a prioritization signal, not a judgment of good/bad, so it must
      // never shift through Confidence's positive/warning/neutral palette.
      expect(lowFill).toBe("var(--nova-color-brand-signal)");
      expect(highFill).toBe("var(--nova-color-brand-signal)");
    });

    it("an absent Attention score renders an honest, Attention-specific unavailable label", () => {
      render(<MetricArc score={undefined} metric="attention" />);
      expect(screen.getByRole("img", { name: "Attention not yet available" })).toBeInTheDocument();
    });
  });

  describe("probability", () => {
    it("labels itself Probability, never Confidence or Attention, for the same numeric score", () => {
      render(<MetricArc score={65} metric="probability" />);
      expect(screen.getByRole("img", { name: "Probability 65 percent" })).toBeInTheDocument();
    });

    it("renders in its own fixed hue, distinct from Confidence's banding and Attention's fixed hue", () => {
      const { container } = render(<MetricArc score={65} metric="probability" />);
      const fill = container.querySelector(".nova-metric-arc__fill").getAttribute("stroke");
      expect(fill).toBe("var(--nova-color-brand-cyan)");
      expect(fill).not.toBe("var(--nova-color-brand-signal)");
    });
  });

  it("hides the numeric value by default across every metric (arc-first, per the masterplan's collapsed-view discipline)", () => {
    render(<MetricArc score={82} metric="confidence" />);
    expect(screen.queryByText("82")).not.toBeInTheDocument();
  });

  it("shows the real numeric value when showValue is explicitly requested", () => {
    render(<MetricArc score={82} metric="attention" showValue />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("clamps an out-of-range score into 0-100 rather than rendering an invalid arc", () => {
    render(<MetricArc score={140} metric="confidence" showValue />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("defaults to the confidence metric when none is specified, for backward-compatible callers", () => {
    render(<MetricArc score={82} />);
    expect(screen.getByRole("img", { name: "Confidence 82 out of 100 — High" })).toBeInTheDocument();
  });
});
