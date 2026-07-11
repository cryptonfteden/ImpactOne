// Applies existing migrations to DATABASE_URL_TEST instead of DATABASE_URL.
// Run this whenever the schema changes, before running the backend test
// suite (backend/test/testEnv.js switches the app itself to the same
// test database at test-run time).
const path = require("path");
const dotenv = require("dotenv");
const { spawnSync } = require("child_process");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL_TEST) {
  console.error("DATABASE_URL_TEST is not set in backend/.env");
  process.exit(1);
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

process.exit(result.status === null ? 1 : result.status);
