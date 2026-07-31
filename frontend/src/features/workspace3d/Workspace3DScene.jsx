import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import Earth from "./Earth";
import OrbitalNode from "./OrbitalNode";
import CameraRig from "./CameraRig";
import MissionControlChain from "./MissionControlChain";
import { ORBITAL_MODULES, ORBIT_RADIUS, orbitalPosition, focusedCameraFor, OVERVIEW_CAMERA } from "./orbitalConfig";

// Phase IMPACTONE-3D-WORKSPACE-001 — the real <Canvas> scene: Earth,
// the 7 orbital modules, dynamic lighting, and the camera rig that
// animates between them. Deliberately no real-time shadow-mapped point
// lights and no postprocessing pipeline (bloom/motion-blur libraries) —
// soft shadows/reflections here come from cheap material tricks
// (emissive glow, transparent shells) so the scene holds 60fps on
// modest GPUs. See IMPACTONE_3D_ARCHITECTURE.md's Performance section
// for the full, disclosed set of tradeoffs.
export default function Workspace3DScene({ focusedModuleKey, onSelectModule, showMissionControlChain }) {
  const focusedModule = ORBITAL_MODULES.find((module) => module.key === focusedModuleKey);
  const cameraTarget = focusedModule
    ? focusedCameraFor(orbitalPosition(ORBITAL_MODULES.indexOf(focusedModule), ORBITAL_MODULES.length))
    : OVERVIEW_CAMERA;

  return (
    <Canvas
      className="workspace3d-canvas"
      dpr={[1, 2]}
      camera={{ position: OVERVIEW_CAMERA.position, fov: 50 }}
      // Frustum culling is three.js's own per-mesh default (never
      // disabled anywhere in this scene) — nothing behind the camera or
      // outside its view frustum is rasterized.
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[8, 6, 4]} intensity={1.4} castShadow />
        <pointLight position={[-8, -4, -6]} intensity={0.3} color="#4f8cff" />
        <Stars radius={80} depth={30} count={1200} factor={2} fade speed={0.4} />
        <Earth />
        {ORBITAL_MODULES.map((module, index) => (
          <OrbitalNode
            key={module.key}
            module={module}
            position={orbitalPosition(index, ORBITAL_MODULES.length, ORBIT_RADIUS)}
            isFocused={focusedModuleKey === module.key}
            isDimmed={Boolean(focusedModuleKey) && focusedModuleKey !== module.key}
            onSelect={onSelectModule}
          />
        ))}
        {showMissionControlChain ? <MissionControlChain /> : null}
        <CameraRig target={cameraTarget} />
      </Suspense>
    </Canvas>
  );
}
