const methodologyVersioningService = require("../services/methodologyVersioningService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function recordVersion(req, res, next) {
  try {
    const { version, reason, evidence, affectedModels, expectedImpact } = req.body || {};
    res.status(201).json(await methodologyVersioningService.recordVersion({ version, reason, evidence, affectedModels, expectedImpact }));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function listVersions(req, res, next) {
  try {
    res.json(await methodologyVersioningService.listVersions({ affectedModel: req.query.affectedModel }));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function rollback(req, res, next) {
  try {
    res.json(await methodologyVersioningService.rollbackToVersion(req.params.version, { reason: req.body?.reason }));
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { recordVersion, listVersions, rollback };
