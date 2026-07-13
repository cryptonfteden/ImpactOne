const portfolioEngineService = require("../services/portfolioEngineService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function getPortfolioSummary(req, res, next) {
  try {
    const summary = await portfolioEngineService.getPortfolioSummary();
    res.json(summary);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function placeOrder(req, res, next) {
  try {
    const { symbol, side, quantity, sector, assetType } = req.body || {};
    const result = await portfolioEngineService.placeOrder({ symbol, side, quantity, sector, assetType });
    res.status(201).json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getTradeHistory(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const trades = await portfolioEngineService.getTradeHistory({ limit });
    res.json({ trades });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getTransactionLog(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const transactions = await portfolioEngineService.getTransactionLog({ limit });
    res.json({ transactions });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getPerformanceTimeline(req, res, next) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const timeline = await portfolioEngineService.getPerformanceTimeline({ limit });
    res.json({ timeline });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function capturePerformanceSnapshot(req, res, next) {
  try {
    const snapshot = await portfolioEngineService.capturePerformanceSnapshot();
    res.status(201).json(snapshot);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getPerformanceDelta(req, res, next) {
  try {
    const delta = await portfolioEngineService.getPerformanceDelta();
    res.json(delta);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function resetPortfolio(req, res, next) {
  try {
    const summary = await portfolioEngineService.resetPortfolio();
    res.json(summary);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = {
  getPortfolioSummary,
  placeOrder,
  getTradeHistory,
  getTransactionLog,
  getPerformanceTimeline,
  capturePerformanceSnapshot,
  getPerformanceDelta,
  resetPortfolio,
};
