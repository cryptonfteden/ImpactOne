// Required first (for side effects) by every test that touches a
// Prisma-backed service, before that service is required. Points
// DATABASE_URL at the isolated test database so the suite never
// touches dev data — config/env.js's dotenv.config() calls are
// non-overriding, so setting process.env.DATABASE_URL here first wins.
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL_TEST) {
  throw new Error(
    "DATABASE_URL_TEST is not set in backend/.env — required to run the backend test suite against an isolated database."
  );
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
