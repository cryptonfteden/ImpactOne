import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Page, Section, Container, Grid, Stack, Spacer, Panel } from "./index";

describe("NOVA layout primitives (Phase X12B, Part 4)", () => {
  it("Page renders children inside the .nova-page surface", () => {
    render(
      <Page>
        <p>hello</p>
      </Page>
    );
    expect(screen.getByText("hello").closest(".nova-page")).toBeTruthy();
  });

  it("Container caps width and centers via .nova-container", () => {
    render(<Container data-testid="c">content</Container>);
    expect(screen.getByTestId("c").className).toContain("nova-container");
  });

  it("Section renders as a real <section> by default and accepts an `as` override", () => {
    const { container } = render(<Section>body</Section>);
    expect(container.querySelector("section.nova-section")).toBeTruthy();

    const { container: asideContainer } = render(<Section as="aside">body</Section>);
    expect(asideContainer.querySelector("aside.nova-section")).toBeTruthy();
  });

  it("Grid applies the .nova-grid class", () => {
    render(<Grid data-testid="g">cells</Grid>);
    expect(screen.getByTestId("g").className).toContain("nova-grid");
  });

  it("Stack sets direction/align/justify as data-attributes, never inline layout logic", () => {
    render(
      <Stack data-testid="s" direction="horizontal" align="center" justify="between" gap={6} wrap>
        items
      </Stack>
    );
    const el = screen.getByTestId("s");
    expect(el.getAttribute("data-direction")).toBe("horizontal");
    expect(el.getAttribute("data-align")).toBe("center");
    expect(el.getAttribute("data-justify")).toBe("between");
    expect(el.getAttribute("data-wrap")).toBe("wrap");
    expect(el.style.gap).toBe("var(--nova-space-6)");
  });

  it("Stack defaults to vertical/stretch/start with no wrap", () => {
    render(<Stack data-testid="s">items</Stack>);
    const el = screen.getByTestId("s");
    expect(el.getAttribute("data-direction")).toBe("vertical");
    expect(el.getAttribute("data-wrap")).toBeNull();
  });

  it("Spacer renders an aria-hidden block sized from a real spacing token, vertical axis by default", () => {
    const { container } = render(<Spacer size={8} />);
    const el = container.firstChild;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.style.blockSize).toBe("var(--nova-space-8)");
  });

  it("Spacer supports a horizontal axis", () => {
    const { container } = render(<Spacer size={4} axis="horizontal" />);
    const el = container.firstChild;
    expect(el.style.inlineSize).toBe("var(--nova-space-4)");
  });

  it("Panel defaults to elevation 1 (a normal surface), never glass by default", () => {
    render(<Panel data-testid="p">card</Panel>);
    expect(screen.getByTestId("p").getAttribute("data-elevation")).toBe("1");
  });

  it("Panel requires glass to be requested explicitly", () => {
    render(
      <Panel data-testid="p" elevation="glass">
        overlay
      </Panel>
    );
    expect(screen.getByTestId("p").getAttribute("data-elevation")).toBe("glass");
  });

  it("Panel falls back to elevation 1 for an invalid elevation value", () => {
    render(
      <Panel data-testid="p" elevation="not-real">
        card
      </Panel>
    );
    expect(screen.getByTestId("p").getAttribute("data-elevation")).toBe("1");
  });
});
