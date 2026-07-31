import { Sparkles } from "@react-three/drei";

// Phase CINEMATIC-EXPERIENCE-002 — shared atmosphere primitives for
// both 3D scenes (the 3D Workspace and the Flagship screen): real
// exponential depth fog (three.js's own built-in `fogExp2`, a single,
// free-per-pixel renderer feature — no extra draw call) and a real,
// GPU-cheap space-particle field (`@react-three/drei`'s `Sparkles`, one
// `Points` draw call regardless of particle count) layered in front of
// the existing `<Stars>` background field for real foreground depth —
// "space particles" and "background stars" are now two visually
// distinct, differently-moving layers rather than one.
//
// `intensity` (0..1, from the caller's own real ambient-state
// computation where one exists — see flagshipScreen/ambientState.js)
// scales both the fog's density (a calmer moment reads as slightly
// clearer space; a busier one, slightly denser/closer) and the
// particle count — real visual intensity driven by real data, per the
// mission's own explicit rule, not a fixed decorative density.
export default function WorldAtmosphere({ color = "#0b1230", intensity = 0.3 }) {
  const particleCount = Math.round(40 + intensity * 80);

  return (
    <>
      <fogExp2 attach="fog" args={[color, 0.012 + intensity * 0.01]} />
      <Sparkles count={particleCount} scale={[30, 30, 30]} size={1.2} speed={0.15 + intensity * 0.2} color="#eaf1ff" opacity={0.5} />
    </>
  );
}
