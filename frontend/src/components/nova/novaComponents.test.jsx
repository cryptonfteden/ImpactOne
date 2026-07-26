import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button";
import Badge, { confidenceBand, ConfidenceBadge } from "./Badge";
import Card from "./Card";
import { Field, TextInput, Toggle } from "./Field";
import { AiLearning } from "./Ai";

describe("Button", () => {
  it("renders the requested variant/size as data-attributes", () => {
    render(
      <Button variant="danger" size="large">
        Delete
      </Button>
    );
    const button = screen.getByText("Delete");
    expect(button.getAttribute("data-variant")).toBe("danger");
    expect(button.getAttribute("data-size")).toBe("large");
  });

  it("is disabled and non-interactive while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Submit
      </Button>
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  it("disabled prevents the click handler from firing", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Go
      </Button>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("confidenceBand / ConfidenceBadge (the one confidence vocabulary reused everywhere)", () => {
  it("maps real score ranges to the fixed 4-band vocabulary", () => {
    expect(confidenceBand(10).label).toBe("Low");
    expect(confidenceBand(45).label).toBe("Moderate");
    expect(confidenceBand(70).label).toBe("High");
    expect(confidenceBand(90).label).toBe("Very High");
  });

  it("boundary values resolve to the correct band", () => {
    expect(confidenceBand(39).label).toBe("Low");
    expect(confidenceBand(40).label).toBe("Moderate");
    expect(confidenceBand(64).label).toBe("Moderate");
    expect(confidenceBand(65).label).toBe("High");
    expect(confidenceBand(84).label).toBe("High");
    expect(confidenceBand(85).label).toBe("Very High");
  });

  it("renders the real score alongside the band label", () => {
    render(<ConfidenceBadge score={82} />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
    expect(screen.getByText(/82\/100/)).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("applies the requested semantic tone", () => {
    render(<Badge tone="negative">Incorrect</Badge>);
    expect(screen.getByText("Incorrect").getAttribute("data-tone")).toBe("negative");
  });
});

describe("Card", () => {
  it("defaults to elevation 1, never glass, unless requested", () => {
    render(<Card title="Default card">body</Card>);
    expect(screen.getByText("Default card").closest(".nova-panel").getAttribute("data-elevation")).toBe("1");
  });

  it("glass must be requested explicitly", () => {
    render(<Card variant="glass" title="Glass card">body</Card>);
    expect(screen.getByText("Glass card").closest(".nova-panel").getAttribute("data-elevation")).toBe("glass");
  });

  it("loading state renders skeletons, not real content", () => {
    render(<Card loading title="Should not render">real content</Card>);
    expect(screen.queryByText("Should not render")).not.toBeInTheDocument();
    expect(screen.queryByText("real content")).not.toBeInTheDocument();
  });

  it("expandable cards start collapsed and expand on click", () => {
    render(
      <Card expandable title="Reasoning">
        full text
      </Card>
    );
    expect(screen.getByText("Show more")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show more"));
    expect(screen.getByText("Show less")).toBeInTheDocument();
  });
});

describe("Field + Toggle", () => {
  it("renders a real error hint tied to the field's state", () => {
    render(
      <Field label="Symbol" state="error" hint="Required" htmlFor="symbol">
        <TextInput id="symbol" />
      </Field>
    );
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("Toggle reflects checked state via aria-checked and calls onChange with the flipped value", () => {
    const onChange = vi.fn();
    render(<Toggle checked={false} onChange={onChange} aria-label="Notifications" />);
    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("AiLearning", () => {
  it("is inactive below the real minimum sample size", () => {
    render(<AiLearning sampleSize={8} minimumSampleSize={15} />);
    expect(screen.getByText(/8 \/ 15 outcomes needed/)).toBeInTheDocument();
    expect(screen.queryByText(/Active/)).not.toBeInTheDocument();
  });

  it("becomes active once the sample meets the threshold", () => {
    render(<AiLearning sampleSize={15} minimumSampleSize={15} />);
    expect(screen.getByText(/Active/)).toBeInTheDocument();
  });
});
