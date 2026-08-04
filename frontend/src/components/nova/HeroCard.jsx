import { useState } from "react";
import Card from "./Card";

// Phase DESIGN-SYSTEM-001 — extracted from the near-identical hero
// pattern duplicated in MissionControlHomeScreen.jsx (Top Priority) and
// PortfolioWorkspaceScreen.jsx ("How am I doing?"): the single, largest,
// highest-elevation object on a screen — the one place the Emphasis
// surface material (`.mc-hero`) and the one-time entrance pulse
// (`.mc-hero--enter`) are used, per IMPACTONE_DESIGN_BIBLE.md §3.5/§6.7
// and MISSION_CONTROL_EXPERIENCE_MASTERPLAN.md §3.1. Never a second
// object on the same screen — see DESIGN_SYSTEM.md's usage rules.
export default function HeroCard({ eyebrow, children, className = "", ...rest }) {
  // The emphasis pulse plays exactly once, on mount, then permanently
  // removes itself — never a looping/repeating animation (Bible §6.7).
  const [pulsing, setPulsing] = useState(true);

  return (
    <Card className={`mc-hero${pulsing ? " mc-hero--enter" : ""} ${className}`.trim()} onAnimationEnd={() => setPulsing(false)} eyebrow={eyebrow} {...rest}>
      {children}
    </Card>
  );
}
