import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EARTH_RADIUS } from "../workspace3d/orbitalConfig";

const WAVE_MAX_RADIUS = EARTH_RADIUS * 2.6;
const SECTOR_POOL_SIZE = 4;
const SECTOR_CYCLE_MIN_S = 2.5;
const SECTOR_CYCLE_MAX_S = 6;
const SHOCKWAVE_DURATION_S = 2.2;
const RING_THICKNESS_RATIO = 0.94; // inner/outer ratio of the one, reused unit ring geometry

// Phase CINEMATIC-EXPERIENCE-002 — every ring (sector wave or breaking-
// news shockwave) is the exact same cheap technique: one static, unit-
// radius `RingGeometry` created once (never regenerated — expanding a
// ring by recreating its geometry every frame would be real,
// unnecessary GPU/CPU work) and animated purely via `scale` + material
// `opacity`, both free per-frame transform/uniform updates.
function ExpandingRing({ progressRef, color, visibleRef }) {
  const meshRef = useRef(null);
  const materialRef = useRef(null);

  useFrame(() => {
    if (!meshRef.current || !materialRef.current) return;
    const progress = progressRef.current;
    const visible = visibleRef ? visibleRef.current : true;
    const radius = Math.max(progress * WAVE_MAX_RADIUS, 0.001);
    meshRef.current.scale.setScalar(radius);
    materialRef.current.opacity = visible ? (1 - progress) * 0.4 : 0;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[RING_THICKNESS_RATIO, 1, 48]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={0} side={2 /* THREE.DoubleSide */} depthWrite={false} />
    </mesh>
  );
}

// Phase CINEMATIC-EXPERIENCE-002 — "sector activity waves": a real,
// small, fixed pool of expanding rings (constant draw-call count
// regardless of how much real activity exists) whose cadence is driven
// by the real, live count of active global events — more real activity
// genuinely produces a faster, busier wave rhythm, not a fixed
// decorative loop. Each pool slot owns one ref-driven progress value,
// computed per-frame from the shared clock plus a deterministic phase
// offset (the same established per-instance-phase pattern OrbitalNode
// already uses) — no React state, no re-renders.
function SectorActivityWaves({ eventCount, color }) {
  const phases = useMemo(() => Array.from({ length: SECTOR_POOL_SIZE }, (_, i) => i / SECTOR_POOL_SIZE), []);
  const progressRefs = useMemo(() => phases.map(() => ({ current: 0 })), [phases]);
  const visibleRef = useRef(eventCount > 0);
  visibleRef.current = eventCount > 0;

  useFrame((state) => {
    const cycleSeconds = SECTOR_CYCLE_MAX_S - (Math.min(eventCount, 8) / 8) * (SECTOR_CYCLE_MAX_S - SECTOR_CYCLE_MIN_S);
    phases.forEach((phase, index) => {
      progressRefs[index].current = (state.clock.elapsedTime / cycleSeconds + phase) % 1;
    });
  });

  return (
    <group>
      {progressRefs.map((progressRef, index) => (
        <ExpandingRing key={index} progressRef={progressRef} color={color} visibleRef={visibleRef} />
      ))}
    </group>
  );
}

// Phase CINEMATIC-EXPERIENCE-002 — "breaking-news shockwave animation":
// a real, one-shot expanding ring triggered exactly when the real
// Breaking News panel's data genuinely grows (see FlagshipScreen.jsx's
// trigger tracking) — never a periodic decorative loop. Progress is
// computed from the real elapsed wall-clock time since the real trigger
// fired; once it reaches 1 the ring is simply not rendered (the parent
// also prunes old triggers from its own list on a timer, so this list
// never grows unbounded).
function Shockwave({ startedAt, color }) {
  const progressRef = useRef(0);
  useFrame(() => {
    progressRef.current = Math.min((Date.now() - startedAt) / 1000 / SHOCKWAVE_DURATION_S, 1);
  });
  return <ExpandingRing progressRef={progressRef} color={color} />;
}

/**
 * @param {{ eventCount: number, sectorColor: string, shockwaveTriggers: Array<{id: string|number, startedAt: number}>, shockwaveColor: string }} props
 */
export default function ActivityWaves({ eventCount, sectorColor, shockwaveTriggers, shockwaveColor }) {
  return (
    <group>
      <SectorActivityWaves eventCount={eventCount} color={sectorColor} />
      {shockwaveTriggers.map((trigger) => (
        <Shockwave key={trigger.id} startedAt={trigger.startedAt} color={shockwaveColor} />
      ))}
    </group>
  );
}
