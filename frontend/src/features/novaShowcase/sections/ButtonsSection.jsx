import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Button } from "../../../components/nova";

export default function ButtonsSection() {
  return (
    <ShowcaseSection id="buttons" number={3} title="Buttons" description="Primary, Secondary, Ghost, Danger, Success, Loading, Disabled, Icon-only, sizes, and real keyboard focus.">
      <Stack direction="horizontal" gap={4} wrap>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="success">Success</Button>
        <Button variant="primary" loading>
          Loading
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="secondary" iconOnly aria-label="Settings">
          ⚙
        </Button>
      </Stack>

      <Stack direction="horizontal" gap={4} align="center" wrap>
        <Button variant="primary" size="compact">
          Compact
        </Button>
        <Button variant="primary" size="default">
          Default
        </Button>
        <Button variant="primary" size="large">
          Large
        </Button>
      </Stack>

      <p className="nova-text-sm" style={{ color: "var(--nova-color-text-tertiary)" }}>
        Tab to the button below to see the real keyboard focus ring (uses <code className="nova-text-mono">:focus-visible</code> + <code className="nova-text-mono">--nova-glow-focus</code>, never a bare mouse-hover outline).
      </p>
      <Stack direction="horizontal" align="start">
        <Button variant="primary" className="nova-focus-ring">
          Tab to me
        </Button>
      </Stack>
    </ShowcaseSection>
  );
}
