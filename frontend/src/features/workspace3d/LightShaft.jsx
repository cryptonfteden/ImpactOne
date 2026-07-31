import { useMemo } from "react";
import { Vector3, Quaternion } from "three";

const CONE_UP = new Vector3(0, 1, 0);

// Phase CINEMATIC-EXPERIENCE-002 — "volumetric light," faked cheaply: a
// real volumetric-scattering effect requires either a dedicated
// postprocessing pass (screen-space god-rays) or raymarching a fog
// volume in a custom shader — both meaningfully more expensive than
// this scene's existing budget allows (see PERFORMANCE_REVIEW.md's
// established "no postprocessing pipeline" tradeoff from the prior
// phase, unchanged here). Instead: one real, static, additive, low-
// poly cone mesh, its apex-to-base axis computed via real vector math
// from `from` (the key light's own real position) to `to` (its real
// target, typically the Earth's origin) — a well-understood, single-
// draw-call approximation of a light shaft, cheap enough to leave on
// continuously.
export default function LightShaft({ from, to = [0, 0, 0], length = 9, radius = 2.4, color = "#eaf1ff" }) {
  const { midpoint, quaternion } = useMemo(() => {
    const start = new Vector3(...from);
    const end = new Vector3(...to);
    const direction = end.clone().sub(start).normalize();
    const mid = start.clone().lerp(end, 0.35); // apex near the light, base reaching toward the Earth
    const rotation = new Quaternion().setFromUnitVectors(CONE_UP, direction.clone().negate());
    return { midpoint: mid, quaternion: rotation };
  }, [from, to]);

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <coneGeometry args={[radius, length, 24, 1, true]} />
      <meshBasicMaterial color={color} transparent opacity={0.045} depthWrite={false} side={2 /* THREE.DoubleSide */} />
    </mesh>
  );
}
