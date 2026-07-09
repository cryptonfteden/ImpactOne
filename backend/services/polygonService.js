const axios = require("axios");
const { POLYGON_API_KEY } = require("../config/env");

async function getPreviousClose(symbol) {
  if (!POLYGON_API_KEY) {
    return {
      symbol,
      previousClose: 121.4,
      change: 2.8,
    };
  }

  try {
    const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`, {
      params: { adjusted: true, apiKey: POLYGON_API_KEY },
    });

    const result = response.data.results?.[0];
    return {
      symbol,
      previousClose: result?.c || 0,
      change: result?.c ? ((result.c - result.o) / result.o) * 100 : 0,
    };
  } catch (error) {
    return {
      symbol,
      previousClose: 121.4,
      change: 2.8,
    };
  }
}

module.exports = { getPreviousClose };
