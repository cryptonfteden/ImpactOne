import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { OVERVIEW_CAMERA } from "./orbitalConfig";

const LERP_SPEED = 2.2; // higher = snappier; tuned to feel cinematic, not instant

// Phase IMPACTONE-3D-WORKSPACE-001 — "the camera moves, the workspace
// transforms" (mission's own words for navigation). Every real
// transition is a smooth exponential lerp of both camera position and
// look-at target toward whatever `target` prop is currently set — no
// jump cuts, no page reload feeling. Runs once per frame via useFrame,
// so it composes with React state changes (clicking a module just
// updates the target prop; this component does the actual animating).
export default function CameraRig({ target }) {
  const { camera } = useThree();
  const currentLookAt = useRef(new Vector3(...OVERVIEW_CAMERA.target));
  const desiredPosition = useRef(new Vector3());
  const desiredLookAt = useRef(new Vector3());

  useFrame((_, delta) => {
    const goal = target || OVERVIEW_CAMERA;
    desiredPosition.current.set(...goal.position);
    desiredLookAt.current.set(...goal.target);

    // Frame-rate-independent exponential smoothing — identical real
    // motion regardless of the display's actual refresh rate.
    const t = 1 - Math.exp(-LERP_SPEED * delta);
    camera.position.lerp(desiredPosition.current, t);
    currentLookAt.current.lerp(desiredLookAt.current, t);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
