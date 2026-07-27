import { InlineMessage } from "./Notifications";

// Phase DESIGN-SYSTEM-001 — extracted from the near-identical Demo Mode
// block duplicated in MissionControlHomeScreen.jsx and
// PortfolioWorkspaceScreen.jsx (both introduced in LIVE-DATA-001/
// PORTFOLIO-001). Renders nothing at all once every section is live;
// names the specific section(s) still on fallback content otherwise —
// never a single global "demo" flag, and never silent about a partial
// outage. See DESIGN_SYSTEM.md for full usage rules.
//
// `liveSections` is a `{ [sectionKey]: boolean }` map (true = real data
// loaded); `sectionLabels` maps the same keys to their plain-language
// section names for the partial-outage message.
export default function DemoModeBanner({ liveSections, sectionLabels }) {
  const keys = Object.keys(liveSections || {});
  const demoKeys = keys.filter((key) => !liveSections[key]);

  if (!demoKeys.length) return null;

  const isFullyDemo = demoKeys.length === keys.length;

  return (
    <div
      style={{ marginBlockEnd: "var(--nova-space-6)" }}
      role="status"
      aria-label={isFullyDemo ? "Demo mode: showing simulated intelligence, not live data." : "Some sections are showing simulated data because a live service is unavailable."}
    >
      <InlineMessage tone="info">
        {isFullyDemo ? (
          <>
            <strong>Demo</strong> — every value on this screen is simulated for demonstration. It does not reflect your real portfolio or live
            market data.
          </>
        ) : (
          <>
            <strong>Demo data</strong> — {demoKeys.map((key) => sectionLabels[key] || key).join(", ")} could not be loaded live right now and{" "}
            {demoKeys.length === 1 ? "is" : "are"} showing simulated values. Everything else on this screen reflects real, live data.
          </>
        )}
      </InlineMessage>
    </div>
  );
}
