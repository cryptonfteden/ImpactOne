const impactGraphService = require("../services/impactGraphService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getImpactGraph(req, res, next) {
  try {
    const result = await impactGraphService.getImpactGraph(req.params.symbol);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getPortfolioImpactGraph(req, res, next) {
  try {
    const result = await impactGraphService.getPortfolioImpactGraph(req.betaUserId);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getWorkspaceImpactGraph(req, res, next) {
  try {
    const result = await impactGraphService.getWorkspaceImpactGraph(req.betaUserId, req.params.folderId);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getImpactGraph, getPortfolioImpactGraph, getWorkspaceImpactGraph };
