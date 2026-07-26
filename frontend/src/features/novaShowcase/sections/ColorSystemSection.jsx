import ShowcaseSection, { Swatch } from "../ShowcaseSection";
import { Stack, Panel } from "../../../components/layout";
import { meetsWcagAA } from "../../../utils/contrast";

const SEMANTIC = [
  { name: "Positive", cssVar: "--nova-color-positive" },
  { name: "Negative", cssVar: "--nova-color-negative" },
  { name: "Warning", cssVar: "--nova-color-warning" },
  { name: "Info", cssVar: "--nova-color-info" },
];

const SURFACES = [
  { name: "Base", cssVar: "--nova-surface-base" },
  { name: "Surface 1", cssVar: "--nova-surface-1" },
  { name: "Surface 2", cssVar: "--nova-surface-2" },
  { name: "Surface 3", cssVar: "--nova-surface-3" },
];

export default function ColorSystemSection() {
  const textTertiaryPasses = meetsWcagAA("#8894aa", "#1a2030");

  return (
    <ShowcaseSection id="color-system" number={2} title="Color System" description="Semantic colors, surface levels, glow, glass, elevation, and a real computed contrast example.">
      <Stack direction="horizontal" gap={4} wrap>
        {SEMANTIC.map((color) => (
          <Swatch key={color.cssVar} {...color} />
        ))}
      </Stack>

      <Stack direction="horizontal" gap={4} wrap>
        {SURFACES.map((surface) => (
          <Swatch key={surface.cssVar} {...surface} />
        ))}
      </Stack>

      <Stack direction="horizontal" gap={6} wrap>
        <div style={{ inlineSize: 120, blockSize: 80, borderRadius: "var(--nova-radius-lg)", backgroundColor: "var(--nova-surface-2)", boxShadow: "var(--nova-glow-live)" }} />
        <div style={{ inlineSize: 120, blockSize: 80, borderRadius: "var(--nova-radius-lg)", backgroundColor: "var(--nova-surface-2)", boxShadow: "var(--nova-glow-ai-thinking)" }} />
        <div style={{ inlineSize: 120, blockSize: 80, borderRadius: "var(--nova-radius-lg)", backgroundColor: "var(--nova-surface-2)", boxShadow: "var(--nova-glow-focus)" }} />
      </Stack>

      <Stack direction="horizontal" gap={6} wrap>
        <Panel elevation="0" style={{ padding: "var(--nova-space-4)", inlineSize: 140 }}>
          Elevation 0
        </Panel>
        <Panel elevation="1" style={{ padding: "var(--nova-space-4)", inlineSize: 140 }}>
          Elevation 1
        </Panel>
        <Panel elevation="2" style={{ padding: "var(--nova-space-4)", inlineSize: 140 }}>
          Elevation 2
        </Panel>
        <Panel elevation="glass" style={{ padding: "var(--nova-space-4)", inlineSize: 140 }}>
          Glass (opt-in)
        </Panel>
      </Stack>

      <p className="nova-text-sm" data-testid="contrast-example">
        Real, computed example: <code className="nova-text-mono">--nova-color-text-tertiary</code> against{" "}
        <code className="nova-text-mono">--nova-surface-2</code> {textTertiaryPasses ? "passes" : "fails"} WCAG AA (4.5:1) — see DESIGN_TOKENS.md's changelog.
      </p>
    </ShowcaseSection>
  );
}
