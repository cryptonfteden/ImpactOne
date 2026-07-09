const axios = require("axios");
const { ALPHA_VANTAGE_API_KEY } = require("../config/env");

async function getMarketOverview(functionName = "TIME_SERIES_DAILY", symbol = "IBM") {
  if (!ALPHA_VANTAGE_API_KEY) {
    return {
      symbol,
      function: functionName,
      data: {
        "2024-01-01": { open: 100, high: 104, low: 99, close: 102, volume: 1000 },
      },
    };
  }

  try {
    const response = await axios.get("https://www.alphavantage.co/query", {
      params: { function: functionName, symbol, apikey: ALPHA_VANTAGE_API_KEY },
    });

    return response.data;
  } catch (error) {
    return { symbol, function: functionName, data: {} };
  }
}

module.exports = { getMarketOverview };
