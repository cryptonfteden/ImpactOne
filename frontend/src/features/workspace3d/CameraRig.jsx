import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { OVERVIEW_CAMERA } from "./orbitalConfig";
import { TRANSITION_DURATION_S, easeInOutCubic, cameraGoalKey } from "./cameraEasing";
import useParallax from "./useParallax";

// Phase FLAGSHIP-POLISH-001 — upgraded from a constant-rate exponential
// lerp to a fixed-duration, eased tween (see cameraEasing.js). The old
// exponential approach technically worked (frame-rate independent,
// always converged) but decelerated the same way for every transition
// regardless of distance, which reads as slightly mechanical. A real
// eased tween — snapshot the start pose the instant the target changes,
// ease across a fixed real duration, land exactly on the goal — is the
// standard technique behind a "cinematic" camera move and is what most
// premium 3D products use.

// Phase CINEMATIC-EXPERIENCE-002 — a real, subtle parallax offset is
// now applied on top of the scripted transition (never instead of it):
// the eased tween still always lands exactly on the real destination
// (wayfinding stays deterministic — see SPATIAL_INTERACTION_GUIDE.md's
// existing rationale for why camera transitions stay scripted, not
// physical), but the pointer's real, current position nudges the
// camera a few real units around that destination, smoothed rather than
// snapping — "depth reacts naturally" to where the user is actually
// looking.
const PARALLAX_MAX_OFFSET = 0.6;
const PARALLAX_EASE_RATE = 3;

// Phase LIVING-WORLD-001 — "camera energy": the real, shared world-state
// intensity (0..1, defaulting to a neutral 0.5 for any caller with no
// live-data signal to give it, e.g. the 3D Workspace screen) scales how
// pronounced the parallax nudge above feels — a busier real world reads
// as a slightly more responsive, alive camera. Never affects the
// scripted transition itself (still always lands exactly on the real
// destination) — only the magnitude of the parallax layered on top.
const MIN_ENERGY_SCALE = 0.5;
const MAX_ENERGY_SCALE = 1.3;

// Phase IMPACTONE-3D-WORKSPACE-001 — "the camera moves, the workspace
// transforms" (mission's own words for navigation). Every real
// transition eases smoothly from wherever the camera currently is to
// whatever `target` prop is currently set — no jump cuts, no page
// reload feeling. Runs once per frame via useFrame, so it composes with
// React state changes (clicking a module just updates the target prop;
// this component does the actual animating).
export default function CameraRig({ target, energy = 0.5 }) {
  const { camera } = useThree();
  const startPosition = useRef(new Vector3(...OVERVIEW_CAMERA.position));
  const startLookAt = useRef(new Vector3(...OVERVIEW_CAMERA.target));
  const currentLookAt = useRef(new Vector3(...OVERVIEW_CAMERA.target));
  const goalPosition = useRef(new Vector3());
  const goalLookAt = useRef(new Vector3());
  const elapsed = useRef(0);
  const activeKey = useRef(null);
  const parallax = useParallax();
  const currentParallax = useRef({ x: 0, y: 0 });

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

    // Smoothed parallax — eases toward the real, current pointer
    // position rather than tracking it 1:1, so it reads as depth, not
    // jitter.
    const t = 1 - Math.exp(-PARALLAX_EASE_RATE * delta);
    currentParallax.current.x += (parallax.current.x - currentParallax.current.x) * t;
    currentParallax.current.y += (parallax.current.y - currentParallax.current.y) * t;

    const energyScale = MIN_ENERGY_SCALE + Math.min(Math.max(energy, 0), 1) * (MAX_ENERGY_SCALE - MIN_ENERGY_SCALE);
    camera.position.x += currentParallax.current.x * PARALLAX_MAX_OFFSET * energyScale;
    camera.position.y += -currentParallax.current.y * PARALLAX_MAX_OFFSET * 0.6 * energyScale;

    camera.lookAt(currentLookAt.current);
  });

  return null;
}
