const watchlistFolderRepository = require("./watchlistFolderRepository");

function requireBetaUser(betaUserId) {
  if (!betaUserId) {
    const error = new Error("A beta user identity is required for watchlist folders.");
    error.statusCode = 400;
    throw error;
  }
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
}

function normalizeSymbol(symbol) {
  return String(symbol || "").trim().toUpperCase();
}

// Phase H3 — every function here re-verifies ownership by re-querying with
// (id, betaUserId) together, never trusting a folderId alone — this is the
// actual cross-user-access prevention the mission requires, not just a
// convention. A folder that exists but belongs to a different beta user
// is indistinguishable from a folder that doesn't exist (404), never a
// distinguishing 403 that would leak its existence.
async function requireOwnedFolder(betaUserId, folderId) {
  const folder = await watchlistFolderRepository.findFolder(betaUserId, folderId);
  if (!folder) {
    throw notFound("Folder not found.");
  }
  return folder;
}

async function listFolders(betaUserId) {
  requireBetaUser(betaUserId);
  return watchlistFolderRepository.listFolders(betaUserId);
}

async function createFolder(betaUserId, name) {
  requireBetaUser(betaUserId);
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw badRequest("A folder name is required.");
  }
  return watchlistFolderRepository.createFolder(betaUserId, trimmed);
}

async function renameFolder(betaUserId, folderId, name) {
  requireBetaUser(betaUserId);
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    throw badRequest("A folder name is required.");
  }
  await requireOwnedFolder(betaUserId, folderId);
  return watchlistFolderRepository.renameFolder(folderId, trimmed);
}

async function deleteFolder(betaUserId, folderId) {
  requireBetaUser(betaUserId);
  await requireOwnedFolder(betaUserId, folderId);
  await watchlistFolderRepository.deleteFolder(folderId);
}

async function addSymbol(betaUserId, folderId, symbol) {
  requireBetaUser(betaUserId);
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw badRequest("A symbol is required.");
  }
  await requireOwnedFolder(betaUserId, folderId);
  await watchlistFolderRepository.addSymbol(folderId, normalized);
  return watchlistFolderRepository.findFolder(betaUserId, folderId);
}

async function removeSymbol(betaUserId, folderId, symbol) {
  requireBetaUser(betaUserId);
  const normalized = normalizeSymbol(symbol);
  await requireOwnedFolder(betaUserId, folderId);
  await watchlistFolderRepository.removeSymbol(folderId, normalized);
  return watchlistFolderRepository.findFolder(betaUserId, folderId);
}

// Moving = remove from source, add to destination — both folders must be
// owned by the same beta user (re-verified independently, so a request
// can't smuggle in someone else's folder id as either endpoint).
async function moveSymbol(betaUserId, fromFolderId, toFolderId, symbol) {
  requireBetaUser(betaUserId);
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw badRequest("A symbol is required.");
  }
  await requireOwnedFolder(betaUserId, fromFolderId);
  await requireOwnedFolder(betaUserId, toFolderId);

  await watchlistFolderRepository.removeSymbol(fromFolderId, normalized);
  await watchlistFolderRepository.addSymbol(toFolderId, normalized);

  return {
    from: await watchlistFolderRepository.findFolder(betaUserId, fromFolderId),
    to: await watchlistFolderRepository.findFolder(betaUserId, toFolderId),
  };
}

const VALID_FLAGS = ["pinned", "priority", "aiFocus"];

// Phase X5 — Part 4, Professional Watchlists. `flags` is a partial patch;
// only real, recognized boolean flags are ever written — an unknown key
// in the request body is rejected rather than silently written to the
// database.
async function setItemFlags(betaUserId, folderId, symbol, flags) {
  requireBetaUser(betaUserId);
  const normalized = normalizeSymbol(symbol);
  if (!normalized) {
    throw badRequest("A symbol is required.");
  }
  const patch = {};
  for (const key of Object.keys(flags || {})) {
    if (!VALID_FLAGS.includes(key)) {
      throw badRequest(`Unknown flag "${key}" — must be one of ${VALID_FLAGS.join(", ")}.`);
    }
    patch[key] = Boolean(flags[key]);
  }
  await requireOwnedFolder(betaUserId, folderId);
  await watchlistFolderRepository.setItemFlags(folderId, normalized, patch);
  return watchlistFolderRepository.findFolder(betaUserId, folderId);
}

module.exports = {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  addSymbol,
  removeSymbol,
  moveSymbol,
  setItemFlags,
  requireOwnedFolder,
};
