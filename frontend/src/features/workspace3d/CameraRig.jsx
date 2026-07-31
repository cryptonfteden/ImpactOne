import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { OVERVIEW_CAMERA } from "./orbitalConfig";
import { TRANSITION_DURATION_S, easeInOutCubic, cameraGoalKey } from "./cameraEasing";

// Phase FLAGSHIP-POLISH-001 — upgraded from a constant-rate exponential
// lerp to a fixed-duration, eased tween (see cameraEasing.js). The old
// exponential approach technically worked (frame-rate independent,
// always converged) but decelerated the same way for every transition
// regardless of distance, which reads as slightly mechanical. A real
// eased tween — snapshot the start pose the instant the target changes,
// ease across a fixed real duration, land exactly on the goal — is the
// standard technique behind a "cinematic" camera move and is what most
// premium 3D products use.

// Phase IMPACTONE-3D-WORKSPACE-001 — "the camera moves, the workspace
// transforms" (mission's own words for navigation). Every real
// transition eases smoothly from wherever the camera currently is to
// whatever `target` prop is currently set — no jump cuts, no page
// reload feeling. Runs once per frame via useFrame, so it composes with
// React state changes (clicking a module just updates the target prop;
// this component does the actual animating).
export default function CameraRig({ target }) {
  const { camera } = useThree();
  const startPosition = useRef(new Vector3(...OVERVIEW_CAMERA.position));
  const startLookAt = useRef(new Vector3(...OVERVIEW_CAMERA.target));
  const currentLookAt = useRef(new Vector3(...OVERVIEW_CAMERA.target));
  const goalPosition = useRef(new Vector3());
  const goalLookAt = useRef(new Vector3());
  const elapsed = useRef(0);
  const activeKey = useRef(null);

  useFrame((_, delta) => {
    const goal = target || OVERVIEW_CAMERA;
    const key = cameraGoalKey(goal);

    if (key !== activeKey.current) {
      // A real, new destination — snapshot exactly where the camera and
      // look-at point are right now as the tween's start, so a second
      // click mid-transition redirects smoothly from the current pose
      // rather than jumping back to the previous goal first.
      activeKey.current = key;
      startPosition.current.copy(camera.position);
      startLookAt.current.copy(currentLookAt.current);
      goalPosition.current.set(...goal.position);
      goalLookAt.current.set(...goal.target);
      elapsed.current = 0;
    }

    elapsed.current = Math.min(elapsed.current + delta, TRANSITION_DURATION_S);
    const progress = elapsed.current / TRANSITION_DURATION_S;
    const eased = easeInOutCubic(progress);

    camera.position.lerpVectors(startPosition.current, goalPosition.current, eased);
    currentLookAt.current.lerpVectors(startLookAt.current, goalLookAt.current, eased);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
