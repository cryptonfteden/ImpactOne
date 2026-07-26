import { Page, Container, Stack } from "../components/layout";
import {
  BrandIdentitySection,
  ColorSystemSection,
  ButtonsSection,
  InputsSection,
  CardsSection,
  AiComponentsSection,
  DataVisualizationSection,
  NavigationSection,
  NotificationsSection,
  LoadingSection,
  MotionSection,
  AccessibilitySection,
  ResponsiveSection,
} from "../features/novaShowcase/sections";

// Phase X12C.0 — NOVA Showcase. The single, complete gallery of every
// real, reusable NOVA component built on the X12B Foundation — the
// product's own Human Interface Gallery / Material Design Gallery
// equivalent. Development-only (see main.jsx's route gate: requires both
// VITE_DEV_CONSOLE=true AND the literal /nova-showcase URL path — never
// reachable from any in-app nav, and structurally excluded from a
// production build the same way Health/Admin Dashboard already are).
//
// This screen renders ZERO existing application components — every piece
// on this page is either a NOVA layout primitive (X12B) or a NOVA
// component (this phase). No existing screen was touched or redesigned.
export default function NovaShowcaseScreen() {
  return (
    <Page className="nova-text-ui">
      <Container>
        <Stack gap={2} style={{ paddingBlock: "var(--nova-space-8)" }}>
          <span className="nova-heading-eyebrow">Development Only — Never Shipped to Production</span>
          <h1 className="nova-heading-h1" style={{ fontSize: "var(--nova-font-size-3xl)" }}>
            NOVA Showcase
          </h1>
          <p className="nova-heading-subtext">
            The complete, real component gallery built from the NOVA Foundation (Phase X12B). Every example below is a reusable component, not a
            one-off mockup.
          </p>
        </Stack>

        <BrandIdentitySection />
        <ColorSystemSection />
        <ButtonsSection />
        <InputsSection />
        <CardsSection />
        <AiComponentsSection />
        <DataVisualizationSection />
        <NavigationSection />
        <NotificationsSection />
        <LoadingSection />
        <MotionSection />
        <AccessibilitySection />
        <ResponsiveSection />
      </Container>
    </Page>
  );
}
