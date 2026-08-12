const axios = require("axios");
const { NASA_API_KEY } = require("../../../config/env");
const { createUnifiedProvider } = require("../providerAbstraction");

async function fetchNasaEvents() {
  if (!NASA_API_KEY) return [];

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const response = await axios.get("https://api.nasa.gov/DONKI/notifications", {
    params: { startDate, endDate, type: "all", api_key: NASA_API_KEY },
    timeout: 15000,
  });

  return (response.data || []).slice(0, 20).map((notification) => ({
    eventType: "nasa-space-weather-notification",
    sourceType: "government",
    sourceName: "NASA DONKI",
    sourceUrl: notification.messageURL || "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    publishedAt: notification.messageIssueTime ? new Date(notification.messageIssueTime).toISOString() : null,
    symbols: [],
    sectors: [],
    summary: String(notification.messageBody || notification.messageType || "NASA space-weather notification").slice(0, 1000),
    rawReference: { messageId: notification.messageID || null, messageType: notification.messageType || null },
    credibilityScore: 95,
    freshnessScore: 75,
    confidence: 75,
  }));
}

module.exports = createUnifiedProvider(
  {
    providerId: "nasa",
    label: "NASA",
    sourceType: "government",
    category: "space",
    defaultThemes: ["space"],
    rateLimit: { maxPerMinute: 10 },
  },
  fetchNasaEvents
);
