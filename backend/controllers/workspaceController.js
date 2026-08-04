const workspaceService = require("../services/workspaceService");

function handleKnownError(error, res, next) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  return next(error);
}

async function getWorkspace(req, res, next) {
  try {
    const result = await workspaceService.getWorkspace(req.betaUserId, req.params.id);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function addNote(req, res, next) {
  try {
    const note = await workspaceService.addNote(req.betaUserId, req.params.id, req.body?.text);
    res.status(201).json(note);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function getDecisionHistory(req, res, next) {
  try {
    const result = await workspaceService.getWorkspaceDecisionHistory(req.betaUserId, req.params.id);
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { getWorkspace, addNote, getDecisionHistory };
