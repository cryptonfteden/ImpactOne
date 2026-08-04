import ShowcaseSection from "../ShowcaseSection";
import { Stack, Grid, Panel } from "../../../components/layout";

const FRAMES = [
  { label: "Mobile", width: 360 },
  { label: "Tablet", width: 600 },
  { label: "Desktop", width: 900 },
  { label: "Ultra-wide", width: 1200 },
];

export default function ResponsiveSection() {
  return (
    <ShowcaseSection id="responsive" number={13} title="Responsive" description="The real Grid primitive at Desktop / Tablet / Mobile / Ultra-wide widths — scaled preview frames, not device emulation.">
      <Stack gap={6}>
        {FRAMES.map((frame) => (
          <div key={frame.label}>
            <span className="nova-heading-eyebrow">
              {frame.label} ({frame.width}px)
            </span>
            <div style={{ inlineSize: frame.width, maxInlineSize: "100%", overflow: "auto", border: "var(--nova-border-subtle)", borderRadius: "var(--nova-radius-md)", padding: "var(--nova-space-4)" }}>
              <Grid>
                {[1, 2, 3, 4].map((cell) => (
                  <div key={cell} style={{ gridColumn: "span 3" }}>
                    <Panel elevation="1" style={{ padding: "var(--nova-space-4)", textAlign: "center" }}>
                      Cell {cell}
                    </Panel>
                  </div>
                ))}
              </Grid>
            </div>
          </div>
        ))}
      </Stack>
    </ShowcaseSection>
  );
}
