import { useEffect, useRef, useState } from "react";
import { Button, EmptyState, ErrorState, Input, LoadingSpinner } from "./ui";
import ImpactGraph from "./ImpactGraph";
import { workspaceApi, watchlistFoldersApi } from "../services/api";
import { logError } from "../utils/errorHandling";

const TABS = ["Overview", "Notes", "Timeline", "Decision History", "Impact Graph"];

/**
 * Phase X3 — Workspace 2.0. Each Workspace (a Phase H3 WatchlistFolder)
 * becomes a complete investment project view: real notes (incl. a
 * distinct AI-note flag), a real chronological timeline merged from
 * already-real events, real Workspace Health (computed from real market
 * positioning data, honestly null with no symbols yet), real decision
 * history (scoped to this workspace's own tracked symbols), and the
 * Impact Graph for whichever symbol is selected. See
 * WORKSPACE_V2_SPEC.md.
 */
export default function WorkspaceDetail({ folderId, onClose }) {
  const [tab, setTab] = useState("Overview");
  const [workspace, setWorkspace] = useState(null);
  const [decisions, setDecisions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [impactSymbol, setImpactSymbol] = useState(null);
  // "Whole workspace" is a real, deliberate selection (impactSymbol ===
  // null) — distinct from "no default picked yet." This ref makes sure a
  // refresh (e.g. after adding a note) never silently overrides the
  // user's explicit choice back to the first symbol.
  const hasSetDefaultImpactSymbol = useRef(false);

  async function refresh() {
    try {
      const [workspaceResult, decisionsResult] = await Promise.all([
        workspaceApi.get(folderId),
        workspaceApi.getDecisionHistory(folderId),
      ]);
      setWorkspace(workspaceResult);
      setDecisions(decisionsResult);
      if (!hasSetDefaultImpactSymbol.current) {
        hasSetDefaultImpactSymbol.current = true;
        setImpactSymbol(workspaceResult.folder.items[0]?.symbol || null);
      }
      setError("");
    } catch (loadError) {
      logError("workspace detail load failed", loadError);
      setError("Couldn't load this workspace right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    hasSetDefaultImpactSymbol.current = false;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  async function submitNote() {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    try {
      await workspaceApi.addNote(folderId, trimmed);
      setNoteText("");
      await refresh();
    } catch (submitError) {
      logError("add workspace note failed", submitError);
    }
  }

  // Phase X5 — Part 4, Professional Watchlists.
  async function toggleFlag(symbol, flag, currentValue) {
    try {
      await watchlistFoldersApi.setItemFlags(folderId, symbol, { [flag]: !currentValue });
      await refresh();
    } catch (toggleError) {
      logError("workspace symbol flag toggle failed", toggleError);
    }
  }

  if (!folderId) return null;

  return (
    <div className="side-panel-overlay" role="dialog" aria-modal="true" aria-label="Workspace detail" onClick={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="side-panel">
        <div className="side-panel__header">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{workspace?.folder?.name || "Loading workspace…"}</h1>
          </div>
          <Button type="button" className="ghost-button" onClick={onClose}>Close</Button>
        </div>

        {isLoading ? (
          <LoadingSpinner label="Loading workspace" />
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <>
            <div className="workspace-detail__tabs" role="tablist">
              {TABS.map((tabName) => (
                <Button key={tabName} type="button" className={`ghost-button${tab === tabName ? " active" : ""}`} onClick={() => setTab(tabName)}>
                  {tabName}
                </Button>
              ))}
            </div>

            {tab === "Overview" ? (
              <>
                {/* Phase X5 — Part 4, Professional Watchlists. Summary,
                    performance, alert summary, and impact summary all
                    visible at a glance, above Health/Activity — everything
                    the mission names, none of it recomputed here. */}
                <section>
                  <p className="side-panel__section-title">Workspace Summary</p>
                  <div className="workspace-health-grid">
                    <div className="widget-list-item"><strong>Tracked</strong><span>{workspace.summary.trackedSymbolCount}</span></div>
                    <div className="widget-list-item"><strong>Pinned</strong><span>{workspace.summary.pinnedCount}</span></div>
                    <div className="widget-list-item"><strong>Priority</strong><span>{workspace.summary.priorityCount}</span></div>
                    <div className="widget-list-item"><strong>AI focus</strong><span>{workspace.summary.aiFocusCount}</span></div>
                  </div>
                </section>
                <section>
                  <p className="side-panel__section-title">Performance</p>
                  {workspace.performance ? (
                    workspace.performance.avgMomentumPct !== null ? (
                      <p className="company-description">
                        Average momentum across {workspace.performance.symbolsWithData} symbol(s):{" "}
                        <span className={workspace.performance.avgMomentumPct >= 0 ? "positive" : "negative"}>
                          {workspace.performance.avgMomentumPct >= 0 ? "+" : ""}{workspace.performance.avgMomentumPct}%
                        </span>
                        {workspace.performance.symbolsWithoutData ? ` (${workspace.performance.symbolsWithoutData} without real data)` : ""}
                      </p>
                    ) : (
                      <EmptyState message="No real momentum data available for these symbols yet." />
                    )
                  ) : (
                    <EmptyState message="Add a symbol to this workspace to see its performance." />
                  )}
                </section>
                <section>
                  <p className="side-panel__section-title">Alert Summary</p>
                  <div className="workspace-health-grid">
                    <div className="widget-list-item"><strong>Active</strong><span>{workspace.alertSummary.activeCount}</span></div>
                    <div className="widget-list-item"><strong>Triggered</strong><span>{workspace.alertSummary.triggeredCount}</span></div>
                  </div>
                </section>
                <section>
                  <p className="side-panel__section-title">Impact Summary</p>
                  {workspace.impactSummary ? (
                    <p className="company-description">
                      {workspace.impactSummary.symbolsWithChain} symbol(s) with a real causal chain, {workspace.impactSummary.symbolsWithNoData} without yet — {workspace.impactSummary.edgeCount} real edge(s) total.
                    </p>
                  ) : (
                    <EmptyState message="Add a symbol to this workspace to see its Impact Graph summary." />
                  )}
                </section>
                <section>
                  <p className="side-panel__section-title">Symbols</p>
                  {workspace.folder.items.length ? (
                    <div className="folder-card__symbols">
                      {workspace.folder.items.map((item) => (
                        <div key={item.symbol} className="folder-symbol-row">
                          <strong>{item.symbol}</strong>
                          <div className="folder-symbol-row__actions">
                            <Button type="button" className={`ghost-button${item.pinned ? " active" : ""}`} onClick={() => toggleFlag(item.symbol, "pinned", item.pinned)}>
                              {item.pinned ? "Pinned" : "Pin"}
                            </Button>
                            <Button type="button" className={`ghost-button${item.priority ? " active" : ""}`} onClick={() => toggleFlag(item.symbol, "priority", item.priority)}>
                              {item.priority ? "Priority" : "Set priority"}
                            </Button>
                            <Button type="button" className={`ghost-button${item.aiFocus ? " active" : ""}`} onClick={() => toggleFlag(item.symbol, "aiFocus", item.aiFocus)}>
                              {item.aiFocus ? "AI focus" : "Set AI focus"}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState message="No symbols tracked yet." />
                  )}
                </section>
                <section>
                  <p className="side-panel__section-title">Workspace Health</p>
                  {workspace.health ? (
                    <div className="workspace-health-grid">
                      <div className="widget-list-item"><strong>Tracked symbols</strong><span>{workspace.health.trackedSymbolCount}</span></div>
                      <div className="widget-list-item"><strong>Long pressure</strong><span>{workspace.health.longPressureCount}</span></div>
                      <div className="widget-list-item"><strong>Short pressure</strong><span>{workspace.health.shortPressureCount}</span></div>
                      <div className="widget-list-item"><strong>Recent triggers</strong><span>{workspace.health.recentTriggerCount}</span></div>
                    </div>
                  ) : (
                    <EmptyState message="No symbols tracked yet — health can't be computed honestly without real data." />
                  )}
                </section>
                <section>
                  <p className="side-panel__section-title">Known Gaps</p>
                  {workspace.knownGaps.map((gap) => (
                    <p key={gap.gap} className="company-description subtle">{gap.reason}</p>
                  ))}
                </section>
                <section>
                  <p className="side-panel__section-title">Recent Activity</p>
                  {workspace.recentActivity.length ? (
                    workspace.recentActivity.map((event, index) => (
                      <div key={index} className="timeline-item">
                        <span className="pill">{event.type}</span>
                        <span>{event.symbol || event.text}</span>
                        <span className="company-description subtle">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="No activity recorded yet." />
                  )}
                </section>
              </>
            ) : null}

            {tab === "Notes" ? (
              <section>
                <div className="onboarding-numeric-step">
                  <Input type="text" placeholder="Add a note" value={noteText} onChange={(event) => setNoteText(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitNote()} />
                  <Button type="button" className="primary-action" onClick={submitNote}>Add note</Button>
                </div>
                {workspace.notes.length ? (
                  workspace.notes.map((note) => (
                    <div key={note.id} className="timeline-item">
                      <span className="pill">{note.isAiNote ? "AI" : "You"}</span>
                      <span>{note.text}</span>
                      <span className="company-description subtle">{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No notes yet." />
                )}
              </section>
            ) : null}

            {tab === "Timeline" ? (
              <section>
                {workspace.timeline.length ? (
                  workspace.timeline.map((event, index) => (
                    <div key={index} className="timeline-item">
                      <span className="pill">{event.type}</span>
                      <span>{event.symbol || event.text}</span>
                      <span className="company-description subtle">{new Date(event.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No timeline events yet." />
                )}
              </section>
            ) : null}

            {tab === "Decision History" ? (
              <section>
                {decisions?.items?.length ? (
                  decisions.items.map((item) => (
                    <div key={item.id} className="timeline-item">
                      <strong>{item.symbol}</strong>
                      <span>{item.reason}</span>
                      <span className="company-description subtle">{new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <EmptyState message="No decisions recorded for this workspace's symbols yet." />
                )}
              </section>
            ) : null}

            {tab === "Impact Graph" ? (
              <section>
                {workspace.folder.items.length ? (
                  <>
                    <div className="opportunity-item__actions">
                      <Button type="button" className={`ghost-button${impactSymbol === null ? " active" : ""}`} onClick={() => setImpactSymbol(null)}>
                        Whole workspace
                      </Button>
                      {workspace.folder.items.map((item) => (
                        <Button key={item.symbol} type="button" className={`ghost-button${impactSymbol === item.symbol ? " active" : ""}`} onClick={() => setImpactSymbol(item.symbol)}>
                          {item.symbol}
                        </Button>
                      ))}
                    </div>
                    {impactSymbol ? (
                      <ImpactGraph symbol={impactSymbol} />
                    ) : (
                      <ImpactGraph symbol={folderId} scope="workspace" />
                    )}
                  </>
                ) : (
                  <EmptyState message="Add a symbol to this workspace to see its Impact Graph." />
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
