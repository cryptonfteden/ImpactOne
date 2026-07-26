import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { useTheme } from "../../../context/ThemeProvider";
import { Button, AiThinking, Skeleton } from "../../../components/nova";

export default function MotionSection() {
  const { motionPreference, setMotionPreference, prefersReducedMotion } = useTheme();

  return (
    <ShowcaseSection id="motion" number={11} title="Motion Showcase" description="Every approved animation from MOTION_FOUNDATION.md, and a live Reduced Motion comparison.">
      <Stack direction="horizontal" gap={4} align="center">
        <span className="nova-text-sm">
          Current motion preference: <strong>{motionPreference}</strong> {prefersReducedMotion ? "(animations are disabled below)" : ""}
        </span>
        <Button variant="secondary" onClick={() => setMotionPreference(prefersReducedMotion ? "full" : "reduced")}>
          {prefersReducedMotion ? "Enable motion" : "Reduce motion"}
        </Button>
      </Stack>

      <Stack direction="horizontal" gap={8} wrap align="center">
        <div style={{ textAlign: "center" }}>
          <div className="nova-transition-micro" style={{ inlineSize: 48, blockSize: 48, borderRadius: "var(--nova-radius-md)", backgroundColor: "var(--nova-color-brand-signal)" }} />
          <span className="nova-text-xs">Micro (120ms)</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="nova-transition-standard" style={{ inlineSize: 48, blockSize: 48, borderRadius: "var(--nova-radius-md)", backgroundColor: "var(--nova-color-brand-signal)" }} />
          <span className="nova-text-xs">Standard (200ms)</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <div className="nova-transition-screen" style={{ inlineSize: 48, blockSize: 48, borderRadius: "var(--nova-radius-md)", backgroundColor: "var(--nova-color-brand-signal)" }} />
          <span className="nova-text-xs">Screen (320ms)</span>
        </div>
        <div style={{ textAlign: "center" }}>
          <AiThinking label="AI Thinking loop" />
        </div>
        <div style={{ textAlign: "center" }}>
          <Skeleton width={80} height={48} />
          <span className="nova-text-xs">Skeleton shimmer</span>
        </div>
      </Stack>
    </ShowcaseSection>
  );
}
