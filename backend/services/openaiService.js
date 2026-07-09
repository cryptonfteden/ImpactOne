const axios = require("axios");
const { OPENAI_API_KEY } = require("../config/env");

async function analyzeTicker(symbol) {
  if (!OPENAI_API_KEY) {
    return {
      symbol,
      score: 8.8,
      recommendation: "Buy",
      summary: "Mock AI analysis ready. Add OPENAI_API_KEY to enable live insights.",
      bullCase: ["Demand remains strong", "Execution is improving"],
      bearCase: ["Valuation can expand", "Macro sentiment can shift"],
      risks: ["Rate volatility", "Earnings surprises"],
      catalysts: ["Upcoming earnings", "Product launch"],
      fundamentals: ["Revenue growth remains healthy", "Margins are stable"],
      technicals: ["Trend is positive", "Momentum remains constructive"],
    };
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI investment analyst producing concise structured analysis.",
          },
          {
            role: "user",
            content: `Provide a concise investment analysis for ${symbol} with score, buy/hold/sell recommendation, bull case, bear case, key risks, catalysts, fundamentals, and technicals.`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      symbol,
      score: 8.7,
      recommendation: "Buy",
      summary: response.data.choices?.[0]?.message?.content || "Live AI analysis returned.",
      bullCase: ["Demand remains healthy"],
      bearCase: ["Valuation can be stretched"],
      risks: ["Macro risk"],
      catalysts: ["Earnings"],
      fundamentals: ["Margins remain healthy"],
      technicals: ["Momentum is constructive"],
    };
  } catch (error) {
    return {
      symbol,
      score: 7.9,
      recommendation: "Hold",
      summary: "Live AI analysis failed. Falling back to conservative mock insight.",
      bullCase: ["Demand remains healthy"],
      bearCase: ["Market conditions can be choppy"],
      risks: ["Macro volatility"],
      catalysts: ["Upcoming company events"],
      fundamentals: ["Monitor margins closely"],
      technicals: ["Watch support levels"],
    };
  }
}

module.exports = { analyzeTicker };
