import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Line } from "@react-three/drei";
import { Vector3 } from "three";
import Earth from "../workspace3d/Earth";
import OrbitalNode from "../workspace3d/OrbitalNode";
import CameraRig from "../workspace3d/CameraRig";
import MissionControlChain from "../workspace3d/MissionControlChain";
import { OVERVIEW_CAMERA } from "../workspace3d/orbitalConfig";
import { FLAGSHIP_PANELS, flagshipPanelPosition, flagshipFocusedCamera } from "./panelConfig";
import { NEUTRAL_AMBIENT_STATE } from "./ambientState";

// Phase FLAGSHIP-SCREEN-001 — one pulsing line from the Earth's own
// origin to a real affected holding's panel position, the mission's own
// "draw animated connections from the Earth directly to those holdings"
// requirement. `offset` staggers multiple simultaneous holdings so they
// don't all pulse in lockstep.
//
// Phase IMMERSIVE-INTERACTIONS-001 — `speed` is now a real parameter
// (previously a hardcoded constant): the pulse travels faster when the
// real portfolio move behind it is larger, so the animation's own pace
// carries real meaning rather than being an arbitrary fixed rate.
function HoldingConnection({ targetPosition, offset, speed, color }) {
  const pulseRef = useRef(null);
  const target = useMemo(() => new Vector3(...targetPosition), [targetPosition]);
  const origin = useMemo(() => new Vector3(0, 0, 0), []);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const t = (Math.sin(state.clock.elapsedTime * speed + offset) + 1) / 2;
    pulseRef.current.position.lerpVectors(origin, target, t);
  });

  return (
    <group>
      <Line points={[[0, 0, 0], targetPosition]} color={color} lineWidth={1} transparent opacity={0.35} />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

// Phase IMMERSIVE-INTERACTIONS-001 — a real connecting line's opacity
// now reflects that specific panel's own real, current data status
// (live/loading/error), rather than one constant value for all 10 —
// "all visual intensity must be driven by live data," applied literally
// to the one purely decorative constant this scene still had.
function panelLineOpacity(status) {
  if (status === "live") return 0.28;
  if (status === "error") return 0.4;
  return 0.12; // loading — present but quiet, nothing to report yet
}

// Phase IMMERSIVE-INTERACTIONS-001 — the orbital node's own pulse
// amplitude, driven by that same real status: a live panel pulses at
// its normal rate, a loading one is nearly still (nothing to report
// yet), and an errored one pulses more noticeably — a real, legible
// signal, not decoration.
function panelPulseAmplitude(status) {
  if (status === "live") return 0.08;
  if (status === "error") return 0.14;
  return 0.03;
}

// Phase FLAGSHIP-SCREEN-001 — the real <Canvas> for the flagship screen.
// Same lighting/perf posture as the 3D Workspace scene (Phase
// IMPACTONE-3D-WORKSPACE-001) — see FLAGSHIP_IMPLEMENTATION.md's
// Performance section. Adds: a visible connecting line from the Earth
// to every one of the 10 real panels (mission: "every panel connects
// visually to the Earth"), and real, animated Earth-to-holding
// connections when the real portfolio data names affected holdings.
// Phase FLAGSHIP-POLISH-001 — computed once, module-level: stable array
// references so each memoized OrbitalNode can actually skip re-rendering
// when unrelated screen state (e.g. panel data refreshing) changes.
const PANEL_POSITIONS = FLAGSHIP_PANELS.map((_, index) => flagshipPanelPosition(index));

export default function FlagshipEarthScene({
  focusedPanelKey,
  onSelectPanel,
  showMissionChain,
  affectedHoldingsCount,
  holdingMagnitude = 0,
  panelStatuses = {},
  ambientState = NEUTRAL_AMBIENT_STATE,
}) {
  const focusedIndex = FLAGSHIP_PANELS.findIndex((panel) => panel.key === focusedPanelKey);
  const cameraTarget = useMemo(
    () => (focusedIndex >= 0 ? flagshipFocusedCamera(focusedIndex) : OVERVIEW_CAMERA),
    [focusedIndex]
  );
  const portfolioPanelIndex = FLAGSHIP_PANELS.findIndex((panel) => panel.key === "portfolioHealth");
  const portfolioPosition = PANEL_POSITIONS[portfolioPanelIndex];
  // Real pulse speed: scales with the real magnitude of the portfolio
  // move driving these connections (clamped to a sane, still-legible
  // animation rate — never so fast it reads as noise).
  const holdingPulseSpeed = 0.7 + Math.min(holdingMagnitude, 1) * 1.8;

  return (
    <Canvas
      className="flagship-canvas"
      dpr={[1, 2]}
      shadows="soft"
      camera={{ position: OVERVIEW_CAMERA.position, fov: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        {/* Phase IMMERSIVE-INTERACTIONS-001 — ambient/key light intensity
            now scales with the real, live-data-derived activity level
            (ambientState.intensity) — a quieter market genuinely reads
            as a quieter scene, a busier one genuinely reads brighter. */}
        <ambientLight intensity={0.25 + ambientState.intensity * 0.25} />
        <directionalLight position={[8, 6, 4]} intensity={1.2 + ambientState.intensity * 0.5} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-8, -4, -6]} intensity={0.2 + ambientState.intensity * 0.3} color={ambientState.color} />
        <Stars radius={90} depth={35} count={1500} factor={2} fade speed={0.4} />
        <Earth ambientColor={ambientState.color} ambientIntensity={0.18 + ambientState.intensity * 0.18} />
        {FLAGSHIP_PANELS.map((panel, index) => {
          const position = PANEL_POSITIONS[index];
          const status = panelStatuses[panel.key] || "loading";
          return (
            <group key={panel.key}>
              <Line points={[[0, 0, 0], position]} color={panel.color} lineWidth={0.75} transparent opacity={panelLineOpacity(status)} />
              <OrbitalNode
                module={panel}
                position={position}
                isFocused={focusedPanelKey === panel.key}
                isDimmed={Boolean(focusedPanelKey) && focusedPanelKey !== panel.key}
                onSelect={onSelectPanel}
                pulseAmplitude={panelPulseAmplitude(status)}
              />
            </group>
          );
        })}
        {Array.from({ length: Math.min(affectedHoldingsCount, 4) }).map((_, index) => (
          <HoldingConnection
            key={index}
            targetPosition={portfolioPosition}
            offset={index * 1.3}
            speed={holdingPulseSpeed}
            color={ambientState.color}
          />
        ))}
        {showMissionChain ? <MissionControlChain /> : null}
        <CameraRig target={cameraTarget} />
      </Suspense>
    </Canvas>
  );
}
