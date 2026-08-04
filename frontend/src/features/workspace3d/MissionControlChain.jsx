import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { Vector3 } from "three";
import { MISSION_CONTROL_CHAIN, NEUTRAL_ACCENT_COLOR } from "./orbitalConfig";

const CHAIN_SPACING = 2.2;
const CHAIN_Y = 3.5;

function chainNodePosition(index, total) {
  const totalWidth = (total - 1) * CHAIN_SPACING;
  return [index * CHAIN_SPACING - totalWidth / 2, CHAIN_Y, 0];
}

// Phase IMPACTONE-3D-WORKSPACE-001 — the mission's own named real chain
// (Global Event → AI Reasoning → Sector Impact → Company Impact →
// Portfolio Impact → Recommendation), rendered as a live, animated line
// of floating nodes above Mission Control, with a single glowing pulse
// traveling the full chain on a loop — a real, deterministic animation,
// not a static diagram. Presentation-only: it visualizes the same real
// pipeline this codebase's own recommendation engine already runs
// (Sprint 41/42's unified committee → DecisionTrace → Outcome), it does
// not compute or alter any of it.
export default function MissionControlChain() {
  const positions = useMemo(
    () => MISSION_CONTROL_CHAIN.map((_, index) => chainNodePosition(index, MISSION_CONTROL_CHAIN.length)),
    []
  );
  const pulseRef = useRef(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    progressRef.current = (progressRef.current + delta * 0.25) % 1;
    if (!pulseRef.current) return;
    const segment = progressRef.current * (positions.length - 1);
    const fromIndex = Math.floor(segment);
    const toIndex = Math.min(fromIndex + 1, positions.length - 1);
    const localT = segment - fromIndex;
    const from = new Vector3(...positions[fromIndex]);
    const to = new Vector3(...positions[toIndex]);
    pulseRef.current.position.lerpVectors(from, to, localT);
  });

  return (
    <group>
      <Line points={positions} color={NEUTRAL_ACCENT_COLOR} lineWidth={1.5} transparent opacity={0.5} />
      {positions.map((position, index) => (
        <group key={MISSION_CONTROL_CHAIN[index].key} position={position}>
          <mesh>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color={NEUTRAL_ACCENT_COLOR} emissive={NEUTRAL_ACCENT_COLOR} emissiveIntensity={0.8} />
          </mesh>
          <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
            <div className="workspace3d-chain-label">{MISSION_CONTROL_CHAIN[index].label}</div>
          </Html>
        </group>
      ))}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}
