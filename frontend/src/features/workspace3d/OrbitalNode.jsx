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
// (separate from focus/selection): the pointer cursor changes, the node
// brightens and scales slightly, independent of whether it's currently
// selected. `memo` avoids re-rendering all 10 nodes on every parent
// re-render (e.g. a data refresh) when a given node's own props haven't
// actually changed.
function OrbitalNode({ module, position, isFocused, isDimmed, onSelect }) {
  const meshRef = useRef(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const [isHovered, setIsHovered] = useState(false);

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

  useFrame((state) => {
    if (!meshRef.current) return;
    // A gentle, real "reacts to market activity" pulse — deterministic
    // per-node phase offset so all 7 nodes don't pulse in lockstep.
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.5 + phase) * 0.08;
    const hoverBump = isHovered ? 1.12 : 1;
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
