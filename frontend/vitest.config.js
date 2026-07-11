import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Standalone from vite.config (none exists — the app runs on Vite's
// zero-config defaults) so adding tests can't change dev/build behavior.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.js"],
    globals: true,
  },
});
