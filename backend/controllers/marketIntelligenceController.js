const providerInventoryService = require("../services/intelligence/providerInventoryService");
const evidenceMatrixService = require("../services/intelligence/evidenceMatrixService");
const technicalIntelligenceService = require("../services/intelligence/technicalIntelligenceService");
const socialInfluenceService = require("../services/intelligence/socialInfluenceService");
const analystConsensusService = require("../services/intelligence/analystConsensusService");
const cryptoDerivativesService = require("../services/intelligence/cryptoDerivativesService");
const optionsIntelligenceService = require("../services/intelligence/optionsIntelligenceService");
const cotIntelligenceService = require("../services/intelligence/cotIntelligenceService");
const researchAgentService = require("../services/researchAgentService");

async function getProviderInventory(req, res, next) {
  try {
    res.json({ providers: await providerInventoryService.generateInventory() });
  } catch (error) {
    next(error);
  }
}

async function getEvidenceMatrix(req, res, next) {
  try {
    res.json(await evidenceMatrixService.buildEvidenceMatrix(req.params.symbol));
  } catch (error) {
    next(error);
  }
}

async function getTechnical(req, res, next) {
  try {
    res.json(await technicalIntelligenceService.analyzeSymbol(req.params.symbol));
  } catch (error) {
    next(error);
  }
}

function getSocialInfluence(req, res) {
  res.json({ watchlist: socialInfluenceService.getWatchlist(), feed: socialInfluenceService.getFixtureFeed() });
}

function getAnalystConsensus(req, res) {
  res.json(analystConsensusService.getFixtureConsensus(req.params.symbol));
}

function getCryptoDerivatives(req, res) {
  res.json(cryptoDerivativesService.getFixtureSnapshot(req.params.symbol));
}

function getOptions(req, res) {
  res.json(optionsIntelligenceService.getFixtureSnapshot(req.params.symbol));
}

async function getCot(req, res, next) {
  try {
    res.json(await cotIntelligenceService.getCotIntelligence(req.params.market));
  } catch (error) {
    next(error);
  }
}

async function listResearchPrinciples(req, res, next) {
  try {
    res.json({ principles: await researchAgentService.listPrinciples() });
  } catch (error) {
    next(error);
  }
}

async function registerResearchPrinciple(req, res, next) {
  try {
    res.status(201).json(await researchAgentService.registerPrinciple(req.body));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}

async function getResearchPrincipleTestStatus(req, res, next) {
  try {
    res.json(await researchAgentService.describeTestStatus(req.params.id));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProviderInventory,
  getEvidenceMatrix,
  getTechnical,
  getSocialInfluence,
  getAnalystConsensus,
  getCryptoDerivatives,
  getOptions,
  getCot,
  listResearchPrinciples,
  registerResearchPrinciple,
  getResearchPrincipleTestStatus,
};
