import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Line, Html } from "@react-three/drei";
import { Vector3 } from "three";
import Earth from "../workspace3d/Earth";
import OrbitalNode from "../workspace3d/OrbitalNode";
import CameraRig from "../workspace3d/CameraRig";
import MissionControlChain from "../workspace3d/MissionControlChain";
import { OVERVIEW_CAMERA } from "../workspace3d/orbitalConfig";
import { FLAGSHIP_PANELS, flagshipPanelPosition, flagshipFocusedCamera } from "./panelConfig";

// Phase FLAGSHIP-SCREEN-001 — one pulsing line from the Earth's own
// origin to a real affected holding's panel position, the mission's own
// "draw animated connections from the Earth directly to those holdings"
// requirement. `offset` staggers multiple simultaneous holdings so they
// don't all pulse in lockstep.
function HoldingConnection({ targetPosition, offset }) {
  const pulseRef = useRef(null);
  const target = useMemo(() => new Vector3(...targetPosition), [targetPosition]);
  const origin = useMemo(() => new Vector3(0, 0, 0), []);

  useFrame((state) => {
    if (!pulseRef.current) return;
    const t = (Math.sin(state.clock.elapsedTime * 1.2 + offset) + 1) / 2;
    pulseRef.current.position.lerpVectors(origin, target, t);
  });

  return (
    <group>
      <Line points={[[0, 0, 0], targetPosition]} color="#4fffb0" lineWidth={1} transparent opacity={0.35} />
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshBasicMaterial color="#4fffb0" />
      </mesh>
    </group>
  );
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

export default function FlagshipEarthScene({ focusedPanelKey, onSelectPanel, showMissionChain, affectedHoldingsCount }) {
  const focusedIndex = FLAGSHIP_PANELS.findIndex((panel) => panel.key === focusedPanelKey);
  const cameraTarget = useMemo(
    () => (focusedIndex >= 0 ? flagshipFocusedCamera(focusedIndex) : OVERVIEW_CAMERA),
    [focusedIndex]
  );
  const portfolioPanelIndex = FLAGSHIP_PANELS.findIndex((panel) => panel.key === "portfolioHealth");
  const portfolioPosition = PANEL_POSITIONS[portfolioPanelIndex];

  return (
    <Canvas
      className="flagship-canvas"
      dpr={[1, 2]}
      shadows="soft"
      camera={{ position: OVERVIEW_CAMERA.position, fov: 50 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[8, 6, 4]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-8, -4, -6]} intensity={0.3} color="#4f8cff" />
        <Stars radius={90} depth={35} count={1500} factor={2} fade speed={0.4} />
        <Earth />
        {FLAGSHIP_PANELS.map((panel, index) => {
          const position = PANEL_POSITIONS[index];
          return (
            <group key={panel.key}>
              <Line points={[[0, 0, 0], position]} color={panel.color} lineWidth={0.75} transparent opacity={0.22} />
              <OrbitalNode
                module={panel}
                position={position}
                isFocused={focusedPanelKey === panel.key}
                isDimmed={Boolean(focusedPanelKey) && focusedPanelKey !== panel.key}
                onSelect={onSelectPanel}
              />
            </group>
          );
        })}
        {Array.from({ length: Math.min(affectedHoldingsCount, 4) }).map((_, index) => (
          <HoldingConnection key={index} targetPosition={portfolioPosition} offset={index * 1.3} />
        ))}
        {showMissionChain ? <MissionControlChain /> : null}
        <CameraRig target={cameraTarget} />
      </Suspense>
    </Canvas>
  );
}
