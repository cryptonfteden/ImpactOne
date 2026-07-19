// Sprint 38 — shared, read-only helper for committee members to pull their
// designated row(s) out of an already-built evidence matrix. This file
// never calls evidenceMatrixService or any provider itself — it only reads
// the matrix object a caller passes in, so every member stays a pure
// function of the matrix it's given.
function findCategory(evidenceMatrix, categoryName) {
  const row = evidenceMatrix.categories.find((entry) => entry.category === categoryName);
  if (!row) throw new Error(`Evidence matrix is missing the "${categoryName}" category — matrix shape has changed`);
  return row;
}

function isRowAvailable(row) {
  return row.stance !== "UNAVAILABLE";
}

module.exports = { findCategory, isRowAvailable };
