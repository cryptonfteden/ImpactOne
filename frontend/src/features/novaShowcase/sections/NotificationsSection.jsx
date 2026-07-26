import ShowcaseSection from "../ShowcaseSection";
import { Stack } from "../../../components/layout";
import { Toast, Alert, Banner, InlineMessage } from "../../../components/nova";

const TONES = ["success", "warning", "error", "info"];

export default function NotificationsSection() {
  return (
    <ShowcaseSection id="notifications" number={9} title="Notifications" description="Toast, Alert, Banner, Inline message — across all four semantic tones.">
      <Stack gap={3}>
        {TONES.map((tone) => (
          <Toast key={tone} tone={tone}>
            {tone[0].toUpperCase() + tone.slice(1)} toast message.
          </Toast>
        ))}
      </Stack>

      <Stack gap={3}>
        {TONES.map((tone) => (
          <Alert key={tone} tone={tone} title={`${tone[0].toUpperCase()}${tone.slice(1)}`}>
            An alert with a title and body, in the {tone} tone.
          </Alert>
        ))}
      </Stack>

      <Banner tone="warning">You&apos;re offline. Showing the last data from 9:41 AM.</Banner>

      <Stack gap={2}>
        {TONES.map((tone) => (
          <InlineMessage key={tone} tone={tone}>
            Inline {tone} message.
          </InlineMessage>
        ))}
      </Stack>
    </ShowcaseSection>
  );
}
