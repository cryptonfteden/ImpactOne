import { Section, Stack } from "../../components/layout";

// Phase X12C.0 — NOVA Showcase. The one reusable section-header shape
// every one of the 13 showcase sections uses — never a one-off heading
// per section.
export default function ShowcaseSection({ id, number, title, description, children }) {
  return (
    <Section id={id} aria-labelledby={`${id}-heading`}>
      <Stack gap={2}>
        <span className="nova-heading-eyebrow">Section {number}</span>
        <h2 id={`${id}-heading`} className="nova-heading-h1">
          {title}
        </h2>
        {description ? <p className="nova-heading-subtext">{description}</p> : null}
      </Stack>
      <Stack gap={6}>{children}</Stack>
    </Section>
  );
}

export function Swatch({ name, cssVar }) {
  return (
    <Stack gap={2} align="start">
      <div
        aria-hidden="true"
        style={{
          inlineSize: 96,
          blockSize: 56,
          borderRadius: "var(--nova-radius-md)",
          backgroundColor: `var(${cssVar})`,
          border: "var(--nova-border-subtle)",
        }}
      />
      <span className="nova-text-xs nova-text-mono">{cssVar}</span>
      <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>
        {name}
      </span>
    </Stack>
  );
}
