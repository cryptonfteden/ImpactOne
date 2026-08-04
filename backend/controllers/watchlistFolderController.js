const watchlistFolderService = require("../services/watchlistFolderService");

function handleKnownError(error, res, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
}

async function listFolders(req, res, next) {
  try {
    const folders = await watchlistFolderService.listFolders(req.betaUserId);
    res.json({ folders });
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function createFolder(req, res, next) {
  try {
    const folder = await watchlistFolderService.createFolder(req.betaUserId, req.body?.name);
    res.status(201).json(folder);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function renameFolder(req, res, next) {
  try {
    const folder = await watchlistFolderService.renameFolder(req.betaUserId, req.params.id, req.body?.name);
    res.json(folder);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function deleteFolder(req, res, next) {
  try {
    await watchlistFolderService.deleteFolder(req.betaUserId, req.params.id);
    res.status(204).end();
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function addSymbol(req, res, next) {
  try {
    const folder = await watchlistFolderService.addSymbol(req.betaUserId, req.params.id, req.body?.symbol);
    res.status(201).json(folder);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function removeSymbol(req, res, next) {
  try {
    const folder = await watchlistFolderService.removeSymbol(req.betaUserId, req.params.id, req.params.symbol);
    res.json(folder);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function moveSymbol(req, res, next) {
  try {
    const result = await watchlistFolderService.moveSymbol(
      req.betaUserId,
      req.params.id,
      req.body?.toFolderId,
      req.body?.symbol
    );
    res.json(result);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

async function setItemFlags(req, res, next) {
  try {
    const folder = await watchlistFolderService.setItemFlags(req.betaUserId, req.params.id, req.params.symbol, req.body);
    res.json(folder);
  } catch (error) {
    handleKnownError(error, res, next);
  }
}

module.exports = { listFolders, createFolder, renameFolder, deleteFolder, addSymbol, removeSymbol, moveSymbol, setItemFlags };
