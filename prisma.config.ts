import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Single source of truth for backend secrets is backend/.env (see backend/config/env.js).
dotenv.config({ path: "backend/.env" });

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
