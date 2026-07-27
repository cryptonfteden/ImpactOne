const themeIntelligenceService = require("../services/themeIntelligenceService");
const userMemoryRepository = require("../services/userMemoryRepository");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listThemes(req, res, next) {
  try {
    res.json({ themes: themeIntelligenceService.listThemes() });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getTheme(req, res, next) {
  try {
    const theme = await themeIntelligenceService.getThemeIntelligence(req.params.themeKey);
    res.json(theme);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getThemeEvolution(req, res, next) {
  try {
    const evolution = await themeIntelligenceService.computeThemeEvolution(req.params.themeKey);
    res.json(evolution);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

// Sprint 30 — Personal Intelligence Layer, Priority 1 (User Memory).
async function recordThemeView(req, res, next) {
  try {
    if (!themeIntelligenceService.THEME_DEFINITIONS[req.params.themeKey]) {
      return res.status(404).json({ error: `Unknown theme: ${req.params.themeKey}` });
    }
    const event = await userMemoryRepository.appendEvent({ eventType: "THEME_VIEWED", subject: req.params.themeKey, betaUserId: req.betaUserId });
    res.status(201).json(event);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listThemes, getTheme, getThemeEvolution, recordThemeView };
