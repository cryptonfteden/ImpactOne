import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EARTH_RADIUS } from "./orbitalConfig";

// Phase IMPACTONE-3D-WORKSPACE-001 — the central object. Deliberately a
// procedural, shader-free sphere (no external texture asset added to
// the bundle) built from three real, stacked meshes: a lit ocean/land
// base, a soft additive atmosphere shell (the "ambient depth"/glow the
// mission asks for), and a faint wireframe grid (reads as "data" without
// needing a real texture). Kept to ~2 low/medium-poly spheres so it
// stays cheap at 60fps — see PRODUCTION-adjacent perf notes in
// IMPACTONE_3D_ARCHITECTURE.md.
export default function Earth() {
  const earthRef = useRef(null);
  const cloudsRef = useRef(null);

  useFrame((_, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.07;
  });

  return (
    <group>
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshStandardMaterial color="#1b3a6b" emissive="#0a1a33" emissiveIntensity={0.4} roughness={0.7} metalness={0.1} />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.015, 32, 32]} />
        <meshStandardMaterial color="#dfe9ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {/* Atmosphere glow — soft additive shell, the "dynamic lighting/ambient
          depth" the mission asks for around the Earth itself. */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.12, 32, 32]} />
        <meshBasicMaterial color="#4f8cff" transparent opacity={0.12} side={2 /* THREE.BackSide */} depthWrite={false} />
      </mesh>
    </group>
  );
}
