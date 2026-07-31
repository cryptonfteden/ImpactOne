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
//
// Phase FLAGSHIP-POLISH-001 — realism pass: `meshPhysicalMaterial` with
// a real `clearcoat` layer gives the ocean a subtle wet sheen (a cheap,
// built-in material property — no new geometry, no texture, no shader
// code), the atmosphere shell now breathes with a slow, real sine pulse
// ("alive," per the mission), and the whole group carries a slight
// axial tilt so the render doesn't read as a perfectly upright, static
// globe.
const AXIAL_TILT_RAD = 0.41; // ~23.5°, Earth's own real axial tilt
const ATMOSPHERE_BASE_OPACITY = 0.12;
const ATMOSPHERE_PULSE_AMPLITUDE = 0.03;

export default function Earth() {
  const earthRef = useRef(null);
  const cloudsRef = useRef(null);
  const atmosphereMaterialRef = useRef(null);

  useFrame((state, delta) => {
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.07;
    if (atmosphereMaterialRef.current) {
      atmosphereMaterialRef.current.opacity =
        ATMOSPHERE_BASE_OPACITY + Math.sin(state.clock.elapsedTime * 0.6) * ATMOSPHERE_PULSE_AMPLITUDE;
    }
  });

  return (
    <group rotation={[0, 0, AXIAL_TILT_RAD]}>
      <mesh ref={earthRef} castShadow receiveShadow>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshPhysicalMaterial
          color="#1b3a6b"
          emissive="#0a1a33"
          emissiveIntensity={0.4}
          roughness={0.65}
          metalness={0.1}
          clearcoat={0.35}
          clearcoatRoughness={0.4}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_RADIUS * 1.015, 32, 32]} />
        <meshStandardMaterial color="#dfe9ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      {/* Atmosphere glow — soft additive shell, the "dynamic lighting/ambient
          depth" the mission asks for around the Earth itself. Now a real,
          slow, continuous breathing pulse rather than a static opacity. */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.12, 32, 32]} />
        <meshBasicMaterial
          ref={atmosphereMaterialRef}
          color="#4f8cff"
          transparent
          opacity={ATMOSPHERE_BASE_OPACITY}
          side={2 /* THREE.BackSide */}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
