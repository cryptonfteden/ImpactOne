const themeIntelligenceService = require("../services/themeIntelligenceService");

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

module.exports = { listThemes, getTheme };
