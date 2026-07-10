const {
  analyzeIntelligence,
  analyzeImpact,
  analyzeHistory,
  analyzeScenario,
  analyzePortfolioIntelligence,
} = require("../services/impactIntelligenceService");

function getEvent(req) {
  return String(req.query.event || req.body?.event || "Fed rate hike");
}

function getSymbol(req) {
  return String(req.query.symbol || req.body?.symbol || "AAPL").toUpperCase();
}

async function intelligenceAnalyze(req, res, next) {
  try {
    const event = getEvent(req);
    const symbol = getSymbol(req);
    const result = await analyzeIntelligence({ event, symbol });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function intelligenceImpact(req, res, next) {
  try {
    const event = getEvent(req);
    const symbol = getSymbol(req);
    const result = await analyzeImpact({ event, symbol });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function intelligenceHistory(req, res, next) {
  try {
    const event = getEvent(req);
    const result = analyzeHistory({ event });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function intelligenceScenario(req, res, next) {
  try {
    const event = getEvent(req);
    const result = analyzeScenario({ event });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

function intelligencePortfolio(req, res, next) {
  try {
    const holdings = req.body?.holdings || [];
    const result = analyzePortfolioIntelligence({ holdings });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  intelligenceAnalyze,
  intelligenceScenario,
  intelligenceImpact,
  intelligenceHistory,
  intelligencePortfolio,
};
