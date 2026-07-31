import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import { Vector3 } from "three";
import { confidenceToIntensity, memberRole, recommendationActionColor, localRingPosition } from "./visualizationMappings";

const CLUSTER_RADIUS = 1.4;
const MAX_CLUSTER_ITEMS = 6;
const MAX_COMMITTEE_MEMBERS = 9;

// Phase DATA-VISUALIZATION-001 — "animated global flow lines": a small,
// traveling pulse along each of the 10 already-existing Earth-to-panel
// connecting lines, moving only for panels with real, live data (a
// loading panel has nothing flowing yet; an errored one pulses in the
// opposite direction — outbound rather than inbound — a real, legible
// "this connection is unhealthy" signal). Bounded at exactly
// FLAGSHIP_PANELS.length (10) instances regardless of data volume.
function FlowPulse({ targetPosition, status, phase }) {
  const pulseRef = useRef(null);
  const target = useMemo(() => new Vector3(...targetPosition), [targetPosition]);
  const origin = useMemo(() => new Vector3(0, 0, 0), []);

  useFrame((state) => {
    if (!pulseRef.current) return;
    if (status === "loading") {
      pulseRef.current.visible = false;
      return;
    }
    pulseRef.current.visible = true;
    const raw = (state.clock.elapsedTime * 0.6 + phase) % 1;
    const t = status === "error" ? 1 - raw : raw; // errored connections flow outward instead of inward
    pulseRef.current.position.lerpVectors(origin, target, t);
  });

  return (
    <mesh ref={pulseRef}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={status === "error" ? "#ff5f5f" : "#eaf1ff"} />
    </mesh>
  );
}

export function CapitalFlowLines({ panelPositions, panelStatuses, panelKeys }) {
  return (
    <group>
      {panelKeys.map((key, index) => (
        <FlowPulse key={key} targetPosition={panelPositions[index]} status={panelStatuses[key] || "loading"} phase={index / panelKeys.length} />
      ))}
    </group>
  );
}

// Phase DATA-VISUALIZATION-001 — "company clusters": one real node per
// currently-active real recommendation, clustered near the AI
// Recommendations panel, colored by its real action and sized by its
// real confidence score — a user can see at a glance how many real
// positions the AI currently holds a view on and how it's leaning,
// without opening the panel.
export function CompanyClusters({ recommendations, anchorPosition }) {
  const items = recommendations.slice(0, MAX_CLUSTER_ITEMS);
  return (
    <group position={anchorPosition}>
      {items.map((rec, index) => {
        const [x, y, z] = localRingPosition(index, items.length, CLUSTER_RADIUS);
        const scale = 0.08 + (Number(rec.confidenceScore) || 0) / 100 * 0.12;
        return (
          <group key={rec.id} position={[x, y, z]}>
            <mesh scale={scale}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color={recommendationActionColor(rec.action)} />
            </mesh>
            <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
              <div className="dataviz-chip">{rec.symbol}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// Phase DATA-VISUALIZATION-001 — "Agent Consensus constellation" +
// "Agent agreement"/"Agent disagreement": one real node per real
// committee member (committeeIntelligenceApi.convene's own
// committee.members), colored green when that real member is part of
// the real agreement (or the supportive side of a real disagreement),
// red when part of the contrary side, and neutral gray otherwise — the
// exact real structure this codebase's own committee already computes,
// visualized rather than duplicated.
export function AgentConstellation({ committee, anchorPosition }) {
  if (!committee?.members?.length) return null;
  const members = committee.members.slice(0, MAX_COMMITTEE_MEMBERS);
  return (
    <group position={anchorPosition}>
      {members.map((member, index) => {
        const [x, y, z] = localRingPosition(index, members.length, CLUSTER_RADIUS * 1.2);
        const role = memberRole(member.memberId, committee);
        const color = role === "agree" ? "#4fffb0" : role === "disagree" ? "#ff5f5f" : "#8a9bd0";
        return (
          <group key={member.memberId} position={[x, y, z]}>
            <Line points={[[0, 0, 0], [-x, -y, -z]]} color={color} lineWidth={0.5} transparent opacity={0.25} />
            <mesh scale={0.09}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshBasicMaterial color={color} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Phase DATA-VISUALIZATION-001 — "Confidence halo": a real ring around
// the Agent Consensus node whose scale/opacity is driven entirely by
// the real cio.confidence category (see visualizationMappings.js) —
// wider and brighter for a real, unanimous committee, thin and faint
// for a real, low-signal one.
export function ConfidenceHalo({ confidenceLabel, anchorPosition }) {
  const intensity = confidenceToIntensity(confidenceLabel);
  return (
    <mesh position={anchorPosition} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.6 + intensity * 0.4, 1.75 + intensity * 0.4, 32]} />
      <meshBasicMaterial color="#5fd0ff" transparent opacity={0.15 + intensity * 0.35} side={2 /* THREE.DoubleSide */} depthWrite={false} />
    </mesh>
  );
}

// Phase DATA-VISUALIZATION-001 — "Claim Intelligence network": one real
// node per currently-active real claim, clustered near the Global
// Events panel, each connected back to that panel's own node — the same
// real claims already listed in the panel's own text content, given a
// spatial, at-a-glance form.
export function ClaimNetwork({ claims, anchorPosition }) {
  const items = claims.slice(0, MAX_CLUSTER_ITEMS);
  return (
    <group position={anchorPosition}>
      {items.map((claim, index) => {
        const [x, y, z] = localRingPosition(index, items.length, CLUSTER_RADIUS * 0.9);
        return (
          <group key={claim.claimId} position={[x, y, z]}>
            <Line points={[[0, 0, 0], [-x, -y, -z]]} color="#ff9f4f" lineWidth={0.5} transparent opacity={0.3} />
            <mesh scale={0.07}>
              <sphereGeometry args={[1, 10, 10]} />
              <meshBasicMaterial color="#ff9f4f" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Phase DATA-VISUALIZATION-001 — "Historical event timeline": real,
// recent overnight claim-status transitions (the same real data the
// Breaking News panel's own text already lists), laid out along a
// small arc near that panel — most recent brightest, older ones
// honestly fainter, a real chronological read rather than a flat list.
export function HistoricalTimeline({ items, anchorPosition }) {
  const entries = items.slice(0, MAX_CLUSTER_ITEMS);
  return (
    <group position={anchorPosition}>
      {entries.map((entry, index) => {
        const angle = (index / Math.max(entries.length - 1, 1)) * Math.PI * 0.6 - Math.PI * 0.3;
        const x = Math.sin(angle) * CLUSTER_RADIUS;
        const y = -Math.cos(angle) * CLUSTER_RADIUS + CLUSTER_RADIUS;
        const opacity = 1 - (index / Math.max(entries.length, 1)) * 0.7;
        return (
          <mesh key={entry.claimId || index} position={[x, y, 0]} scale={0.06}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#ff5f8f" transparent opacity={opacity} />
          </mesh>
        );
      })}
    </group>
  );
}

// Phase DATA-VISUALIZATION-001 — "Importance pulse": a real ring around
// the Earth itself, pulsing at an amplitude driven by the same real,
// already-computed `ambientState.intensity` composite signal (real
// portfolio-move magnitude + real active-event count) every other
// visual-intensity choice in this scene already reads — "how important
// is right now," visualized directly on the one object every other
// visualization radiates from.
export function ImportancePulse({ intensity, color }) {
  const meshRef = useRef(null);
  const materialRef = useRef(null);
  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.8) * 0.06 * (0.3 + intensity);
    meshRef.current.scale.setScalar(2.4 * pulse);
    materialRef.current.opacity = 0.08 + intensity * 0.12;
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.97, 1, 48]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0.1} side={2 /* THREE.DoubleSide */} depthWrite={false} />
    </mesh>
  );
}
