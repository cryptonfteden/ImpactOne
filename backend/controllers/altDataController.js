const {
  getCotData,
  getPolymarketData,
  getMacroData,
  getSecData,
  getCongressData,
  getEconomicEvents,
  getAltDataSummary,
} = require("../services/altDataService");

function getSymbol(req) {
  return String(req.query.symbol || req.body?.symbol || "AAPL").toUpperCase();
}

async function getCot(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const cot = await getCotData({ symbol });
    res.json({ symbol, cot });
  } catch (error) {
    next(error);
  }
}

async function getPolymarket(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const polymarket = await getPolymarketData({ symbol });
    res.json({ symbol, polymarket });
  } catch (error) {
    next(error);
  }
}

async function getMacro(req, res, next) {
  try {
    const macro = await getMacroData();
    res.json({ macro });
  } catch (error) {
    next(error);
  }
}

async function getSec(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const sec = await getSecData({ symbol });
    res.json({ symbol, sec });
  } catch (error) {
    next(error);
  }
}

async function getCongress(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const congress = await getCongressData({ symbol });
    res.json({ symbol, congress });
  } catch (error) {
    next(error);
  }
}

async function getEvents(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const events = await getEconomicEvents({ symbol });
    res.json({ symbol, events });
  } catch (error) {
    next(error);
  }
}

async function getSummary(req, res, next) {
  try {
    const symbol = getSymbol(req);
    const summary = await getAltDataSummary({ symbol });
    res.json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCot,
  getPolymarket,
  getMacro,
  getSec,
  getCongress,
  getEvents,
  getSummary,
};
