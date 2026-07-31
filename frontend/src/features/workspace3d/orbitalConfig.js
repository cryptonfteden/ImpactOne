// Phase IMPACTONE-3D-WORKSPACE-001 — pure, dependency-free scene
// configuration and geometry math. Deliberately has zero import of
// three.js/@react-three/fiber so it can be unit-tested directly under
// jsdom (which has no real WebGL context) without ever mounting a
// <Canvas>. Every 3D component in this feature reads its layout from
// here rather than hardcoding positions inline.

// The 7 orbital modules named in the mission, each mapped onto a real,
// already-existing, already-tested screen — zero new business logic,
// zero new API surface. "Mission Control" is the 8th, central node
// (handled separately — see MissionControlChain.jsx) since it's framed
// as the command center, not a peer orbital module.
export const ORBITAL_MODULES = [
  { key: "Market Intelligence Workspace", label: "Market Intelligence", color: "#4f8cff" },
  { key: "News Intelligence", label: "News Intelligence", color: "#ff9f4f" },
  { key: "AI Analysis Workspace", label: "AI Analysis", color: "#b06bff" },
  { key: "Portfolio Workspace", label: "Portfolio", color: "#4fffb0" },
  { key: "Watchlist Workspace", label: "Watchlist", color: "#ffe14f" },
  { key: "Personal Intelligence Workspace", label: "Personal Intelligence", color: "#ff5f8f" },
  { key: "Alerts", label: "Alerts", color: "#ff5f5f" },
];

export const ORBIT_RADIUS = 6;
export const EARTH_RADIUS = 2;

/**
 * Evenly distributes every module around a real circular orbit in the
 * XZ plane (Earth at the origin), each offset a fixed angle apart —
 * deterministic given the same module list, so tests can assert exact
 * positions rather than approximate ones.
 * @param {number} index
 * @param {number} total
 * @param {number} radius
 * @returns {[number, number, number]}
 */
export function orbitalPosition(index, total, radius = ORBIT_RADIUS) {
  const angle = (index / total) * Math.PI * 2;
  return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
}

/**
 * The real camera position/target pairs this scene lerps between.
 * "overview" keeps the Earth and every orbital module in frame.
 * A focused module's camera sits between the Earth and that module,
 * looking at the module, so the Earth always stays visible in the
 * background — the mission's explicit requirement for Portfolio (and,
 * by the same real rule, every other module).
 * @param {[number, number, number]} modulePosition
 * @returns {{ position: [number, number, number], target: [number, number, number] }}
 */
export function focusedCameraFor(modulePosition) {
  const [x, y, z] = modulePosition;
  const pullBack = 3.5;
  const length = Math.hypot(x, z) || 1;
  const dirX = x / length;
  const dirZ = z / length;
  return {
    position: [x + dirX * pullBack, y + 2.5, z + dirZ * pullBack],
    target: [x, y, z],
  };
}

export const OVERVIEW_CAMERA = {
  position: [0, 9, 14],
  target: [0, 0, 0],
};

// The mission's own named chain: every global event's real, disclosed
// path from raw signal to an actual recommendation. Order matters —
// this is the literal sequence MissionControlChain.jsx animates.
export const MISSION_CONTROL_CHAIN = [
  { key: "event", label: "Global Event" },
  { key: "reasoning", label: "AI Reasoning" },
  { key: "sector", label: "Sector Impact" },
  { key: "company", label: "Company Impact" },
  { key: "portfolio", label: "Portfolio Impact" },
  { key: "recommendation", label: "Recommendation" },
];
