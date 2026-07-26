import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, LoadingSpinner } from "./ui";
import { impactGraphApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { trackEvent } from "../utils/analytics";

function ConfidenceBadge({ confidence }) {
  const tone = confidence >= 60 ? "pill opportunity" : confidence >= 30 ? "pill monitor" : "pill risk";
  return <span className={tone}>{confidence.toFixed(0)}% confidence</span>;
}

/**
 * One real causal edge, rendered as an expandable node: the effect
 * headline, its real explanation and confidence, and (if the graph has
 * one) the upstream cause it expands into. A null causeRecordId is shown
 * explicitly as "Unknown cause" — never invented, per the mission's
 * explicit requirement.
 */
function EdgeNode({ edge, nodesById, depth, expandedIds, onToggle }) {
  const effectNode = nodesById.get(edge.effectRecordId);
  const causeNode = edge.causeRecordId ? nodesById.get(edge.causeRecordId) : null;
  const isExpanded = expandedIds.has(edge.id);

  return (
    <div className="impact-graph__node" style={{ marginLeft: depth * 20 }}>
      <button
        type="button"
        className="impact-graph__node-toggle"
        onClick={() => onToggle(edge.id)}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} evidence for ${effectNode?.headline || edge.effectRecordId}`}
      >
        <span aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
        <span className="impact-graph__headline">{effectNode?.headline || edge.effectRecordId}</span>
      </button>
      {isExpanded ? (
        <div className="impact-graph__node-detail">
          <ConfidenceBadge confidence={edge.confidence} />
          <p className="company-description subtle">{edge.explanation}</p>
          {causeNode ? (
            <div className="impact-graph__cause">
              <span className="impact-graph__cause-label">↓ caused by</span>
              <strong>{causeNode.headline}</strong>
            </div>
          ) : (
            <div className="impact-graph__cause impact-graph__cause--unknown">
              <span className="impact-graph__cause-label">↓ caused by</span>
              <em>Unknown — no upstream cause recorded yet</em>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Phase X4 — Part 2 (Portfolio/Workspace endpoints). One real fetcher per
// scope, all returning the identical { nodes, edges, status, message }
// shape (see impactGraphService.mergeGraphs), so the rendering below is
// shared rather than duplicated per scope.
function fetcherForScope(scope, symbol) {
  if (scope === "portfolio") return () => impactGraphApi.getPortfolioGraph();
  if (scope === "workspace") return () => impactGraphApi.getWorkspaceGraph(symbol);
  return () => impactGraphApi.getGraph(symbol);
}

/**
 * Phase X3/X4 — Impact Graph, ImpactOne's signature feature. Real
 * cause-and-effect chains, built entirely from WorldMemoryRecord/
 * WorldMemoryCausalLink (see IMPACT_GRAPH_V1.md). Every edge carries
 * real evidence (explanation) and real confidence; unknown relationships
 * are shown explicitly, never fabricated. Interactive: click any node to
 * expand its real evidence and upstream cause. X4 adds `scope`
 * ("symbol" default | "portfolio" | "workspace") so the same component
 * renders the merged, real multi-symbol graphs from the new endpoints —
 * `symbol` is the target symbol for "symbol" scope, or the folderId for
 * "workspace" scope.
 */
export default function ImpactGraph({ symbol, scope = "symbol" }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  useEffect(() => {
    if (scope !== "portfolio" && !symbol) return;
    // Phase X9 — Part 1. Fires wherever this component actually renders
    // real data (side panel, workspace tab, portfolio) — one real signal
    // regardless of which host screen embeds it.
    trackEvent("impact_graph_viewed", scope === "symbol" && symbol ? { symbol } : {});
    let cancelled = false;
    setIsLoading(true);
    fetcherForScope(scope, symbol)()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((loadError) => {
        logError("impact graph load failed", loadError);
        if (!cancelled) setError("Couldn't load the Impact Graph right now.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, scope]);

  const nodesById = useMemo(() => new Map((data?.nodes || []).map((node) => [node.id, node])), [data]);

  function toggle(edgeId) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
  }

  const label = scope === "portfolio" ? "your portfolio" : scope === "workspace" ? "this workspace" : symbol;

  if (isLoading) return <LoadingSpinner label={`Building the Impact Graph for ${label}`} />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.status === "NO_DATA") {
    return <EmptyState icon="◈" title="No causal chain recorded yet" message={data?.message || `No real event data exists for ${label} yet.`} />;
  }
  if (data.status === "NODES_ONLY_NO_LINKS") {
    return <EmptyState icon="◈" title="Events exist, but no causal chain yet" message={data.message} />;
  }

  return (
    <div className="impact-graph">
      <p className="company-description subtle">
        {data.edges.length} real causal edge{data.edges.length === 1 ? "" : "s"} recorded for {label}
        {data.unknownUpstreamCount ? `, ${data.unknownUpstreamCount} with an unknown upstream cause` : ""}.
        {data.truncated ? " (graph truncated — showing the closest real connections.)" : ""}
      </p>
      {data.symbolsWithChain?.length ? (
        <p className="company-description subtle">With a real causal chain: {data.symbolsWithChain.join(", ")}.</p>
      ) : null}
      {data.symbolsWithNoData?.length ? (
        <p className="company-description subtle negative">
          No data yet: {data.symbolsWithNoData.map((entry) => entry.symbol).join(", ")} — never fabricated, just not recorded.
        </p>
      ) : null}
      {data.edges.map((edge) => (
        <EdgeNode key={edge.id} edge={edge} nodesById={nodesById} depth={0} expandedIds={expandedIds} onToggle={toggle} />
      ))}
    </div>
  );
}
