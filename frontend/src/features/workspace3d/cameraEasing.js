// Phase FLAGSHIP-POLISH-001 — pure, dependency-free easing math, split
// out of CameraRig.jsx so it's directly unit-testable under plain
// jsdom (no three.js/WebGL context required), matching this feature's
// existing orbitalConfig.js convention.
export const TRANSITION_DURATION_S = 0.9;

/**
 * Standard cubic ease-in-out: slow start, fast middle, slow finish —
 * the shape behind most real "cinematic" camera moves, as opposed to a
 * constant-rate or purely-decelerating motion.
 * @param {number} t 0..1
 * @returns {number} 0..1
 */
export function easeInOutCubic(t) {
  const clamped = Math.min(Math.max(t, 0), 1);
  return clamped < 0.5 ? 4 * clamped * clamped * clamped : 1 - (-2 * clamped + 2) ** 3 / 2;
}

/**
 * A real, stable identity for a { position, target } camera goal, so a
 * consumer can detect "the destination actually changed" vs. "the same
 * object was passed again this render" without relying on reference
 * equality (a new literal is built fresh every render in this codebase's
 * scene components).
 * @param {{ position: number[], target: number[] }} goal
 */
export function cameraGoalKey(goal) {
  return `${goal.position.join(",")}|${goal.target.join(",")}`;
}
