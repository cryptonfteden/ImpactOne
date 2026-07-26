import { useState } from "react";
import ShowcaseSection from "../ShowcaseSection";
import { Stack, Panel } from "../../../components/layout";
import { Button, Badge } from "../../../components/nova";
import { meetsWcagAA, contrastRatio } from "../../../utils/contrast";

// Phase X12C.0 — NOVA Showcase, Section 12. RTL is demonstrated with a
// literal `dir="rtl"` wrapper rather than switching the app's real
// locale — only English has a real translated dictionary today
// (I18nProvider.jsx's own documented scope), so this stays honest about
// what's actually translated vs. what's a layout-mirroring demo.
export default function AccessibilitySection() {
  const [fontScale, setFontScale] = useState(1);
  const ratio = contrastRatio("#8894aa", "#1a2030");

  return (
    <ShowcaseSection id="accessibility" number={12} title="Accessibility" description="Keyboard navigation, focus, contrast, RTL/LTR, and font scaling.">
      <Stack direction="horizontal" gap={4} wrap>
        <Button variant="primary" className="nova-focus-ring">
          Tab stop 1
        </Button>
        <Button variant="secondary" className="nova-focus-ring">
          Tab stop 2
        </Button>
        <Button variant="ghost" className="nova-focus-ring">
          Tab stop 3
        </Button>
      </Stack>

      <p className="nova-text-sm" data-testid="a11y-contrast-line">
        Real computed contrast: <code className="nova-text-mono">{ratio.toFixed(2)}:1</code> —{" "}
        <Badge tone={meetsWcagAA("#8894aa", "#1a2030") ? "positive" : "negative"}>{meetsWcagAA("#8894aa", "#1a2030") ? "Passes" : "Fails"} AA</Badge>
      </p>

      <Stack direction="horizontal" gap={6} wrap>
        <Panel elevation="1" style={{ padding: "var(--nova-space-4)", inlineSize: 240 }} dir="ltr">
          <span className="nova-heading-eyebrow">LTR</span>
          <p className="nova-text-sm">Portfolio value: $1,234.56</p>
        </Panel>
        <Panel elevation="1" style={{ padding: "var(--nova-space-4)", inlineSize: 240 }} dir="rtl">
          <span className="nova-heading-eyebrow">RTL (Hebrew/Arabic layout)</span>
          <p className="nova-text-sm">שווי תיק: $1,234.56</p>
        </Panel>
      </Stack>

      <Stack direction="horizontal" gap={4} align="center">
        <span className="nova-text-sm">Font scale: {fontScale}×</span>
        <input type="range" min="1" max="2" step="0.1" value={fontScale} onChange={(event) => setFontScale(Number(event.target.value))} className="nova-slider" />
      </Stack>
      <p style={{ fontSize: `calc(var(--nova-font-size-base) * ${fontScale})` }}>This paragraph scales with the slider above — verifying layout doesn&apos;t break under browser-level text zoom.</p>
    </ShowcaseSection>
  );
}
