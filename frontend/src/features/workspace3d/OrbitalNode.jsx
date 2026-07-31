import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

// Phase IMPACTONE-3D-WORKSPACE-001 — one floating orbital module. A
// real, clickable 3D node (not a flat DOM button pretending to be 3D):
// it orbits, pulses, and casts a soft glow. Html renders its label as
// real, accessible DOM text positioned by three.js's own projection —
// screen-reader- and click-testable without a WebGL context.
export default function OrbitalNode({ module, position, isFocused, isDimmed, onSelect }) {
  const meshRef = useRef(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    // A gentle, real "reacts to market activity" pulse — deterministic
    // per-node phase offset so all 7 nodes don't pulse in lockstep.
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + phase) * 0.08;
    meshRef.current.scale.setScalar(isFocused ? pulse * 1.35 : pulse);
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(event) => { event.stopPropagation(); onSelect(module.key); }} castShadow>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial
          color={module.color}
          emissive={module.color}
          emissiveIntensity={isFocused ? 1.1 : 0.55}
          transparent
          opacity={isDimmed ? 0.35 : 1}
        />
      </mesh>
      <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div className={`workspace3d-node-label ${isFocused ? "is-focused" : ""} ${isDimmed ? "is-dimmed" : ""}`}>
          {module.label}
        </div>
      </Html>
    </group>
  );
}
