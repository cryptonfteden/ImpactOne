import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Phase RELEASE-BLOCKER-001 — `npm run build` failed unconditionally
// (BUILD_HEALTH_REPORT.md / PRODUCTION_BUILD_FIX_PLAN.md / TOOLING_GAPS.md,
// reconfirmed across every prior phase this engagement touched the
// frontend). Root cause, verified directly: `src/styles/theme.css`'s
// opening file-header comment (line 1) was prematurely closed by a
// literal `*/` inside its own text ("--nova-color-*/--nova-surface-*",
// line 9) — a real, pre-existing CSS defect, invisible to every dev-mode
// render (unminified CSS tolerates it) but fatal to Vite 8's default
// `lightningcss` minifier, whose stricter parser throws "Unexpected end
// of input" once the resulting desync reaches end-of-file across the
// full concatenated production CSS bundle. Fixed at the source (adding a
// space so the comment closes where it always should have); no
// vite.config.js workaround needed once the real defect is gone, and no
// rendered CSS changed as a result (a comment-text fix has zero effect
// on any actual rule).
export default defineConfig({
  plugins: [react()],
});
