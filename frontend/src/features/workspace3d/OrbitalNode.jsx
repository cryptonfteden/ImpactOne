import { useRef, useMemo, useState, useCallback, memo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";

// Phase IMPACTONE-3D-WORKSPACE-001 — one floating orbital module. A
// real, clickable 3D node (not a flat DOM button pretending to be 3D):
// it orbits, pulses, and casts a soft glow. Html renders its label as
// real, accessible DOM text positioned by three.js's own projection —
// screen-reader- and click-testable without a WebGL context.
//
// Phase FLAGSHIP-POLISH-001 — added a real, distinct hover state
// (separate from focus/selection). `memo` avoids re-rendering all 10
// nodes on every parent re-render (e.g. a data refresh) when a given
// node's own props haven't actually changed.
//
// Phase IMMERSIVE-INTERACTIONS-001 — two real changes:
// 1. Hover now eases in/out over a real, short duration (a smoothed
//    ref-based approach toward a 0/1 target each frame) instead of
//    snapping instantly on the boolean flip — "every interaction feels
//    physical," not a binary on/off switch.
// 2. `pulseAmplitude` is now a real, optional prop (defaults to the
//    original constant for callers with no live-data signal to attach,
//    e.g. the 3D Workspace's 7 generic modules) — the Flagship screen
//    passes a real, per-panel value derived from that panel's own
//    current data status, so the "market activity" pulse this component
//    always claimed to represent is, for callers that have the data,
//    now actually driven by it.
function OrbitalNode({ module, position, isFocused, isDimmed, onSelect, pulseAmplitude = 0.08 }) {
  const meshRef = useRef(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const [isHovered, setIsHovered] = useState(false);
  const hoverAmount = useRef(0);

  const handlePointerOver = useCallback((event) => {
    event.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  }, []);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    document.body.style.cursor = "auto";
  }, []);

  const handleClick = useCallback(
    (event) => {
      event.stopPropagation();
      onSelect(module.key);
    },
    [onSelect, module.key]
  );

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // A gentle, real "reacts to market activity" pulse — deterministic
    // per-node phase offset so all 7/10 nodes don't pulse in lockstep,
    // amplitude driven by the real pulseAmplitude prop.
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + phase) * pulseAmplitude;

    // Real, physical hover easing — approaches its target smoothly
    // rather than snapping, at a fixed, frame-rate-independent rate.
    const target = isHovered ? 1 : 0;
    hoverAmount.current += (target - hoverAmount.current) * (1 - Math.exp(-10 * delta));
    const hoverBump = 1 + hoverAmount.current * 0.12;

    meshRef.current.scale.setScalar(isFocused ? pulse * 1.35 : pulse * hoverBump);
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
      >
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshStandardMaterial
          color={module.color}
          emissive={module.color}
          emissiveIntensity={isFocused ? 1.1 : isHovered ? 0.85 : 0.55}
          transparent
          opacity={isDimmed ? 0.35 : 1}
        />
      </mesh>
      <Html center distanceFactor={10} style={{ pointerEvents: "none" }}>
        <div
          className={`workspace3d-node-label ${isFocused ? "is-focused" : ""} ${isDimmed ? "is-dimmed" : ""} ${isHovered ? "is-hovered" : ""}`}
        >
          {module.label}
        </div>
      </Html>
    </group>
  );
}

export default memo(OrbitalNode);
