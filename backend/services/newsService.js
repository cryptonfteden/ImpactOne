const axios = require("axios");
const { NEWS_API_KEY } = require("../config/env");

async function getNews(query = "finance") {
  if (!NEWS_API_KEY) {
    return [
      {
        title: "AI infrastructure demand remains strong",
        description: "Institutional capital continues to flow into compute and cloud leaders.",
        url: "https://example.com/news/1",
      },
    ];
  }

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: { q: query, language: "en", pageSize: 5, apiKey: NEWS_API_KEY },
    });

    return response.data.articles || [];
  } catch (error) {
    return [];
  }
}

module.exports = { getNews };
