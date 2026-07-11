const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

const envCandidates = [
  path.resolve(__dirname, "..", "..", ".env"),
  path.resolve(__dirname, "..", "..", "frontend", ".env"),
  path.resolve(__dirname, "..", ".env"),
  path.resolve(__dirname, "..", "..", "backend", ".env"),
  path.resolve(__dirname, "..", "..", "frontend", ".env.local"),
  path.resolve(__dirname, "..", "..", "backend", ".env.local"),
];

envCandidates.forEach((candidate) => {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
  }
});

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || "development",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY || "",
  POLYGON_API_KEY: process.env.POLYGON_API_KEY || "",
  NEWS_API_KEY: process.env.NEWS_API_KEY || "",
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY || "",
  DATABASE_URL: process.env.DATABASE_URL || "",
  DATABASE_URL_TEST: process.env.DATABASE_URL_TEST || "",
  AUTONOMOUS_ENGINE_ENABLED: process.env.AUTONOMOUS_ENGINE_ENABLED !== "false",
  AUTONOMOUS_ENGINE_INTERVAL_MINUTES: Number(process.env.AUTONOMOUS_ENGINE_INTERVAL_MINUTES) || 30,
};
