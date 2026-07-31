import { Suspense, useCallback, useState } from "react";
import Workspace3DScene from "./Workspace3DScene";
import GlassPanel from "./GlassPanel";
import { ORBITAL_MODULES } from "./orbitalConfig";
import { MODULE_SCREENS, MISSION_CONTROL_SCREEN } from "./moduleScreens";
import "./workspace3d.css";

const MISSION_CONTROL_KEY = "__mission_control__";

// Phase IMPACTONE-3D-WORKSPACE-001 — the real, top-level 3D Workspace.
// Owns exactly one piece of state (which module, if any, is focused)
// and renders two layers over the same continuous scene: the real
// <Canvas> (Earth + orbital modules + camera) and, when a module is
// focused, a glassmorphism panel hosting that module's real, unchanged
// existing screen component — "the camera moves, the workspace
// transforms," never a route/page swap. Reachable today as its own
// screenMap entry ("3D Workspace") alongside every existing screen —
// see IMPACTONE_3D_ARCHITECTURE.md for why this ships additively rather
// than replacing MainLayout's navigation outright in one pass.
export default function Workspace3DFeature() {
  const [focusedModuleKey, setFocusedModuleKey] = useState(null);

  const handleSelectModule = useCallback((key) => {
    setFocusedModuleKey((current) => (current === key ? null : key));
  }, []);

  const handleClosePanel = useCallback(() => setFocusedModuleKey(null), []);

  const focusedModule = ORBITAL_MODULES.find((module) => module.key === focusedModuleKey);
  const ActiveScreen = focusedModuleKey === MISSION_CONTROL_KEY ? MISSION_CONTROL_SCREEN : MODULE_SCREENS[focusedModuleKey];
  const panelTitle = focusedModuleKey === MISSION_CONTROL_KEY ? "Mission Control" : focusedModule?.label;

  return (
    <div className="workspace3d-root">
      <Workspace3DScene
        focusedModuleKey={focusedModuleKey === MISSION_CONTROL_KEY ? null : focusedModuleKey}
        onSelectModule={handleSelectModule}
        showMissionControlChain={focusedModuleKey === MISSION_CONTROL_KEY}
      />
      <div className="workspace3d-toolbar">
        <button
          type="button"
          className={`workspace3d-toolbar__button ${focusedModuleKey === MISSION_CONTROL_KEY ? "is-active" : ""}`}
          onClick={() => handleSelectModule(MISSION_CONTROL_KEY)}
        >
          Mission Control
        </button>
      </div>
      {ActiveScreen ? (
        <GlassPanel title={panelTitle} onClose={handleClosePanel}>
          <Suspense fallback={<div className="workspace3d-glass-panel__loading">Loading...</div>}>
            <ActiveScreen onNavigate={() => {}} />
          </Suspense>
        </GlassPanel>
      ) : null}
    </div>
  );
}
