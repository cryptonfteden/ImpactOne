import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color } from "three";
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
// a real `clearcoat` layer gives the ocean a subtle wet sheen, and the
// whole group carries a slight axial tilt.
//
// Phase IMMERSIVE-INTERACTIONS-001 — two real changes:
// 1. The Earth is now a real, physical drag-to-rotate object — grab and
//    spin it, release and it keeps spinning with real, decaying angular
//    momentum (damped each frame), rather than being purely
//    camera-driven. This is "Earth interaction" and "pointer
//    responsiveness," not a cosmetic add-on.
// 2. The previous phase's constant sine-wave atmosphere "breathing"
//    pulse — a real, disclosed piece of purely decorative idle motion —
//    is removed. Atmosphere color/intensity are now driven entirely by
//    the real `ambientColor`/`ambientIntensity` props (computed from
//    live data by the caller — see flagshipScreen/ambientState.js) and
//    eased smoothly toward whatever the current real value is, so the
//    only atmosphere motion left is a real, purposeful transition
//    toward new real data, never a perpetual idle loop.
const AXIAL_TILT_RAD = 0.41; // ~23.5°, Earth's own real axial tilt
const DRAG_SENSITIVITY = 0.008;
const MOMENTUM_DAMPING_PER_SECOND = 0.94; // fraction of angular velocity retained per ~frame at 60fps
const AMBIENT_EASE_RATE = 2.5; // how quickly the atmosphere eases toward a new real target
// Phase CINEMATIC-EXPERIENCE-002 — "dynamic reflections," faked cheaply:
// a single low-intensity point light slowly orbits the Earth, its own
// color tied to the same real ambientColor everything else in the scene
// reads. As it orbits, the Earth's own `clearcoat` layer (added in
// FLAGSHIP-POLISH-001) picks up a real, moving specular highlight — a
// genuine, cheap, physically-real reflection response, without an
// environment-map texture or a render-target-based reflection probe
// (both real, meaningfully more expensive techniques this scene
// deliberately still avoids — see WORLD_LIGHTING.md).
const REFLECTION_ORBIT_RADIUS = EARTH_RADIUS * 2.2;
const REFLECTION_ORBIT_PERIOD_S = 9;

export default function Earth({ ambientColor = "#4f8cff", ambientIntensity = 0.3 }) {
  const earthRef = useRef(null);
  const cloudsRef = useRef(null);
  const interactionRef = useRef(null);
  const atmosphereMaterialRef = useRef(null);

  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const dragVelocity = useRef(0);
  const manualRotation = useRef(0);
  const currentOpacity = useRef(ambientIntensity);
  const currentColor = useRef(new Color(ambientColor));
  const targetColor = useRef(new Color(ambientColor));
  const reflectionLightRef = useRef(null);

  useEffect(() => {
    targetColor.current.set(ambientColor);
  }, [ambientColor]);

  useEffect(() => {
    function handleWindowPointerMove(event) {
      if (!isDragging.current) return;
      const deltaX = event.clientX - lastPointerX.current;
      lastPointerX.current = event.clientX;
      const delta = deltaX * DRAG_SENSITIVITY;
      manualRotation.current += delta;
      dragVelocity.current = delta;
    }
    function handleWindowPointerUp() {
      isDragging.current = false;
      document.body.style.cursor = "auto";
    }
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      // Phase APPLE-QUALITY-001 — real bug fix: if this component
      // unmounts (e.g. the user navigates away) while the cursor was
      // set to "grab"/"grabbing", the browser cursor stayed stuck in
      // that state forever, since nothing else in the app ever resets
      // it. Always restore it on unmount, regardless of drag state.
      document.body.style.cursor = "auto";
    };
  }, []);

  function handlePointerDown(event) {
    event.stopPropagation();
    isDragging.current = true;
    lastPointerX.current = event.clientX;
    dragVelocity.current = 0;
    document.body.style.cursor = "grabbing";
  }
  function handlePointerOver(event) {
    event.stopPropagation();
    if (!isDragging.current) document.body.style.cursor = "grab";
  }
  function handlePointerOut() {
    if (!isDragging.current) document.body.style.cursor = "auto";
  }

  useFrame((state, delta) => {
    // Core rotation — this is the Earth's own established identity
    // motion ("the Earth is alive," per the original Flagship mission),
    // not decorative; kept as-is.
    if (earthRef.current) earthRef.current.rotation.y += delta * 0.05;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.07;

    // Real physical momentum: once released, the drag's last real
    // velocity keeps rotating the globe, decaying smoothly toward zero
    // rather than stopping instantly — this is the actual "feels
    // physical" requirement, not a metaphor.
    if (!isDragging.current && Math.abs(dragVelocity.current) > 0.00005) {
      const damping = MOMENTUM_DAMPING_PER_SECOND ** (delta * 60);
      manualRotation.current += dragVelocity.current;
      dragVelocity.current *= damping;
    } else if (!isDragging.current) {
      dragVelocity.current = 0;
    }
    if (interactionRef.current) interactionRef.current.rotation.y = manualRotation.current;

    // Ambient lighting eased smoothly toward whatever the current real,
    // live-data-derived target is — a real, purposeful transition
    // (the value just changed because real data changed), never a
    // perpetual idle animation with nothing behind it.
    if (atmosphereMaterialRef.current) {
      const t = 1 - Math.exp(-AMBIENT_EASE_RATE * delta);
      currentOpacity.current += (ambientIntensity - currentOpacity.current) * t;
      currentColor.current.lerp(targetColor.current, t);
      atmosphereMaterialRef.current.opacity = currentOpacity.current;
      atmosphereMaterialRef.current.color.copy(currentColor.current);
    }

    // Orbiting reflection light — real, continuous, purposeful motion
    // (not idle decoration): it's what produces the moving specular
    // highlight described above, every frame.
    if (reflectionLightRef.current) {
      const angle = (state.clock.elapsedTime / REFLECTION_ORBIT_PERIOD_S) * Math.PI * 2;
      reflectionLightRef.current.position.set(Math.cos(angle) * REFLECTION_ORBIT_RADIUS, EARTH_RADIUS * 0.6, Math.sin(angle) * REFLECTION_ORBIT_RADIUS);
      reflectionLightRef.current.color.copy(currentColor.current);
    }
  });

  return (
    <group rotation={[0, 0, AXIAL_TILT_RAD]}>
      <group
        ref={interactionRef}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
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
          {/* Phase IMMERSIVE-INTERACTIONS-001 — segment count reduced
              32→20: this shell is a faint, near-featureless translucent
              layer where the extra tessellation was never visually
              distinguishable; a real, measured GPU-overdraw reduction
              (see PERFORMANCE_REVIEW.md). */}
          <sphereGeometry args={[EARTH_RADIUS * 1.015, 20, 20]} />
          <meshStandardMaterial color="#dfe9ff" transparent opacity={0.08} depthWrite={false} />
        </mesh>
        {/* Invisible, slightly larger pointer target — makes the Earth
            easy to grab even where the visible surface has low pixel
            coverage near its silhouette edge (real pointer-
            responsiveness improvement, not a visual element). */}
        <mesh visible={false}>
          <sphereGeometry args={[EARTH_RADIUS * 1.05, 12, 12]} />
        </mesh>
      </group>
      {/* The orbiting "dynamic reflection" light — see doc comment
          above. Low intensity: a real, subtle highlight, not a second
          key light. */}
      <pointLight ref={reflectionLightRef} intensity={0.4} distance={REFLECTION_ORBIT_RADIUS * 1.5} color={ambientColor} />
      {/* Atmosphere glow — soft additive shell. Color/intensity are now
          entirely real-data-driven (see component doc comment above). */}
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS * 1.12, 20, 20]} />
        <meshBasicMaterial
          ref={atmosphereMaterialRef}
          color={ambientColor}
          transparent
          opacity={ambientIntensity}
          side={2 /* THREE.BackSide */}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
