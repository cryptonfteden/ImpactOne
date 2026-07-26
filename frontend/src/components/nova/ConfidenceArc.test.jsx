import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ConfidenceArc from "./ConfidenceArc";

describe("ConfidenceArc", () => {
  it("exposes the real score and confidence band via an accessible label", () => {
    render(<ConfidenceArc score={82} />);
    expect(screen.getByRole("img", { name: "Confidence 82 out of 100 — High" })).toBeInTheDocument();
  });

  it("hides the numeric value by default (arc-first, per the masterplan's collapsed-view discipline)", () => {
    render(<ConfidenceArc score={82} />);
    expect(screen.queryByText("82")).not.toBeInTheDocument();
  });

  it("shows the real numeric value when showValue is explicitly requested", () => {
    render(<ConfidenceArc score={82} showValue />);
    expect(screen.getByText("82")).toBeInTheDocument();
  });

  it("never fabricates a score — an absent score renders an honest dash and a non-alarming label", () => {
    render(<ConfidenceArc score={undefined} showValue />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Confidence not yet available" })).toBeInTheDocument();
  });

  it("clamps an out-of-range score into 0-100 rather than rendering an invalid arc", () => {
    render(<ConfidenceArc score={140} showValue />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});
