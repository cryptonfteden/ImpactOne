import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Skeleton, ProgressBar, AiThinking, EmptyState, OfflineBanner, ReconnectBanner } from "../../../components/nova";

export default function LoadingSection() {
  return (
    <ShowcaseSection id="loading" number={10} title="Loading" description="Skeletons, Progress, the AI Thinking wave, Empty states, Offline, and Reconnect.">
      <Stack gap={2}>
        <Skeleton height={20} width="30%" />
        <Skeleton height={40} width="80%" />
        <Skeleton height={14} width="60%" />
      </Stack>

      <ProgressBar value={45} label="Grading pending outcomes" />

      <AiThinking label="Generating explanation…" />

      <EmptyState icon="◇" title="No open positions yet" description="Place your first trade to see it here." />

      <OfflineBanner lastUpdatedLabel="9:41 AM" />
      <ReconnectBanner />
    </ShowcaseSection>
  );
}
