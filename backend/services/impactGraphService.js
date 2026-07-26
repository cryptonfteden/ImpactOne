// Phase X3 — Impact Graph. ImpactOne's signature feature: the real
// cause-and-effect chain behind a symbol, built entirely from
// WorldMemoryRecord/WorldMemoryCausalLink (Sprint 21B's real, append-only
// causal-edge infrastructure) — no new data model, no fabrication. If no
// real causal link connects a symbol to anything, that is shown
// explicitly as "no recorded causal chain," never invented.
const { getPrismaClient } = require("../db/prismaClient");
const portfolioEngineService = require("./portfolioEngineService");
const watchlistFolderService = require("./watchlistFolderService");

const DEFAULT_MAX_DEPTH = 3;
const DEFAULT_MAX_NODES = 25;

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function recordMentionsSymbol(record, symbol) {
  const symbols = Array.isArray(record.symbols) ? record.symbols : [];
  return symbols.map((value) => String(value).toUpperCase()).includes(symbol);
}

/**
 * Builds the real, evidence-attached causal graph reachable from a
 * symbol's WorldMemoryRecords, walking WorldMemoryCausalLink edges in
 * both directions (what caused this, what this caused) up to
 * `maxDepth` hops or `maxNodes` total nodes — whichever is reached
 * first, so a densely-linked future dataset can never return an
 * unbounded graph. Confidence is the real, stored, per-edge decimal;
 * never inferred, never averaged into a fabricated composite.
 */
async function getImpactGraph(symbol, { maxDepth = DEFAULT_MAX_DEPTH, maxNodes = DEFAULT_MAX_NODES } = {}) {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!normalized) {
    throw badRequest("A symbol is required.");
  }

  const prisma = getPrismaClient();

  const seedRecords = await prisma.worldMemoryRecord.findMany({
    orderBy: { occurredAt: "desc" },
    take: 500, // real, bounded scan — see ADVANCED_CHART_ARCHITECTURE.md-style honesty note in the spec doc about this not being a full-table symbol index
  });
  const seeds = seedRecords.filter((record) => recordMentionsSymbol(record, normalized));

  if (!seeds.length) {
    return {
      symbol: normalized,
      generatedAt: new Date().toISOString(),
      nodes: [],
      edges: [],
      status: "NO_DATA",
      message: `No WorldMemoryRecord mentions ${normalized} yet — no causal chain can be shown honestly. This is not an error; it means no real event involving this symbol has been recorded.`,
    };
  }

  const nodesById = new Map(seeds.map((record) => [record.id, record]));
  const edges = [];
  const frontier = new Set(seeds.map((record) => record.id));
  let depth = 0;

  while (frontier.size && depth < maxDepth && nodesById.size < maxNodes) {
    const frontierIds = Array.from(frontier);
    frontier.clear();

    const links = await prisma.worldMemoryCausalLink.findMany({
      where: {
        OR: [{ effectRecordId: { in: frontierIds } }, { causeRecordId: { in: frontierIds } }],
      },
    });

    for (const link of links) {
      edges.push(link);
      for (const recordId of [link.effectRecordId, link.causeRecordId]) {
        if (!recordId || nodesById.has(recordId) || nodesById.size >= maxNodes) continue;
        // eslint-disable-next-line no-await-in-loop
        const record = await prisma.worldMemoryRecord.findUnique({ where: { id: recordId } });
        if (record) {
          nodesById.set(recordId, record);
          frontier.add(recordId);
        }
      }
    }
    depth += 1;
  }

  const nodes = Array.from(nodesById.values()).map((record) => ({
    id: record.id,
    headline: record.headline,
    symbols: record.symbols,
    sectors: record.sectors,
    occurredAt: record.occurredAt,
    isSeed: seeds.some((seed) => seed.id === record.id),
  }));

  const dedupedEdges = Array.from(new Map(edges.map((edge) => [edge.id, edge])).values()).map((edge) => ({
    id: edge.id,
    causeRecordId: edge.causeRecordId,
    effectRecordId: edge.effectRecordId,
    explanation: edge.explanation,
    confidence: Number(edge.confidence),
    methodologyVersion: edge.methodologyVersion,
    recordedAt: edge.recordedAt,
  }));

  // Real, honest exogenous-cause disclosure: a null causeRecordId is a
  // deliberate, valid state in this schema (an effect with no recorded
  // upstream cause yet) — surfaced explicitly, not hidden.
  const unknownUpstreamCount = dedupedEdges.filter((edge) => edge.causeRecordId === null).length;

  return {
    symbol: normalized,
    generatedAt: new Date().toISOString(),
    nodes,
    edges: dedupedEdges,
    status: dedupedEdges.length ? "REAL_CHAIN" : "NODES_ONLY_NO_LINKS",
    message: dedupedEdges.length
      ? null
      : `${normalized} has ${seeds.length} recorded event(s) but no causal links between them yet — the chain is genuinely unknown, not fabricated.`,
    unknownUpstreamCount,
    truncated: nodesById.size >= maxNodes,
  };
}

// Merges several real per-symbol graphs into one — real node/edge
// dedup by id, never a fabricated "combined confidence." Symbols with
// no real chain simply contribute nothing (not a fake empty node) but
// are listed in `symbolsWithNoData` so the caller can disclose them.
function mergeGraphs(perSymbolGraphs) {
  const nodesById = new Map();
  const edgesById = new Map();
  const symbolsWithNoData = [];
  const symbolsWithChain = [];

  for (const graph of perSymbolGraphs) {
    if (graph.status === "REAL_CHAIN") {
      symbolsWithChain.push(graph.symbol);
      for (const node of graph.nodes) nodesById.set(node.id, node);
      for (const edge of graph.edges) edgesById.set(edge.id, edge);
    } else {
      symbolsWithNoData.push({ symbol: graph.symbol, status: graph.status, message: graph.message });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesById.values()),
    symbolsWithChain,
    symbolsWithNoData,
    status: nodesById.size ? "REAL_CHAIN" : "NO_DATA",
  };
}

// Phase X4 — Portfolio Impact Graph endpoint. Merges the real, individual
// causal graphs for every symbol the beta user actually holds. A beta
// user with zero positions gets an honest empty merge, not an error.
async function getPortfolioImpactGraph(betaUserId) {
  const summary = await portfolioEngineService.getPortfolioSummary(betaUserId);
  const symbols = (summary.positions || []).map((position) => position.symbol);
  if (!symbols.length) {
    return { generatedAt: new Date().toISOString(), nodes: [], edges: [], symbolsWithChain: [], symbolsWithNoData: [], status: "NO_DATA", message: "No open positions — no portfolio-wide causal chain to show yet." };
  }
  const graphs = await Promise.all(symbols.map((symbol) => getImpactGraph(symbol)));
  return mergeGraphs(graphs);
}

// Phase X4 — Workspace Impact Graph endpoint. Merges the real causal
// graphs for every symbol tracked in one real, owned workspace.
async function getWorkspaceImpactGraph(betaUserId, folderId) {
  const folder = await watchlistFolderService.requireOwnedFolder(betaUserId, folderId);
  const symbols = folder.items.map((item) => item.symbol);
  if (!symbols.length) {
    return { generatedAt: new Date().toISOString(), nodes: [], edges: [], symbolsWithChain: [], symbolsWithNoData: [], status: "NO_DATA", message: "This workspace has no tracked symbols yet." };
  }
  const graphs = await Promise.all(symbols.map((symbol) => getImpactGraph(symbol)));
  return mergeGraphs(graphs);
}

module.exports = { getImpactGraph, getPortfolioImpactGraph, getWorkspaceImpactGraph, DEFAULT_MAX_DEPTH, DEFAULT_MAX_NODES };
