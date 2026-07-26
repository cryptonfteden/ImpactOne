import ShowcaseSection, { Swatch } from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Badge } from "../../../components/nova";

export default function BrandIdentitySection() {
  return (
    <ShowcaseSection id="brand-identity" number={1} title="Brand Identity" description="Logo, brand colors, typography, and spacing — NOVA_DESIGN_BIBLE.md §3.">
      <Stack direction="horizontal" gap={4} align="center">
        <span className="nova-text-display nova-font-extrabold" style={{ fontSize: "var(--nova-font-size-2xl)" }}>
          ImpactOne
        </span>
        <Badge tone="ai">NOVA</Badge>
      </Stack>

      <Stack direction="horizontal" gap={4} wrap>
        <Swatch name="Brand — Signal (accent)" cssVar="--nova-color-brand-signal" />
        <Swatch name="Brand — Violet (AI marker)" cssVar="--nova-color-brand-violet" />
        <Swatch name="Brand — Cyan (updated marker)" cssVar="--nova-color-brand-cyan" />
      </Stack>

      <Stack gap={2}>
        <span className="nova-text-display" style={{ fontSize: "var(--nova-font-size-3xl)" }}>
          Display — Space Grotesk 700
        </span>
        <span className="nova-text-ui nova-text-base">UI — Inter 400/500/600/700</span>
        <span className="nova-text-mono nova-text-sm">Mono — JetBrains Mono (NVDA, x11-v2)</span>
      </Stack>

      <Stack direction="horizontal" gap={2} align="end">
        {[1, 2, 3, 4, 6, 8].map((step) => (
          <div key={step} style={{ textAlign: "center" }}>
            <div style={{ inlineSize: 24, blockSize: `var(--nova-space-${step})`, backgroundColor: "var(--nova-color-brand-signal)" }} />
            <span className="nova-text-xs">{step}</span>
          </div>
        ))}
      </Stack>
    </ShowcaseSection>
  );
}
