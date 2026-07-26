import { useEffect, useState } from "react";
import SectionCard from "../components/SectionCard";
import { Button, EmptyState, ErrorState, Input, LoadingSpinner } from "../components/ui";
import { watchlistFoldersApi, priceAlertsApi } from "../services/api";
import { openSymbolPanel } from "../utils/symbolPanel";
import { OPEN_WORKSPACE_DETAIL_EVENT } from "../utils/navigation";
import WorkspaceDetail from "../components/WorkspaceDetail";
import { logError } from "../utils/errorHandling";
import { trackEvent } from "../utils/analytics";

const EXAMPLE_FOLDER_NAMES = ["AI", "Long Term", "Waiting for Entry", "Space and Defense"];

function Modal({ title, children, onClose }) {
  return (
    <div className="h3-modal-overlay" role="dialog" aria-modal="true">
      <div className="h3-modal-card">
        <h2 className="onboarding-title" style={{ fontSize: "1.1rem" }}>{title}</h2>
        {children}
        <div className="h3-modal-card__actions">
          <Button type="button" className="ghost-button" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Phase H3 — Watchlist Folders & Price Alerts. Every read/write here goes
 * through the real, betaUserId-required backend (watchlistFolderService.js
 * / priceAlertService.js) — folders and alerts genuinely belong to the
 * signed-in beta user, isolated at the database level, not just hidden in
 * the UI.
 */
export default function WatchlistFoldersScreen() {
  const [folders, setFolders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [symbolDrafts, setSymbolDrafts] = useState({});
  const [alertModalFolderId, setAlertModalFolderId] = useState(null);
  const [workspaceDetailFolderId, setWorkspaceDetailFolderId] = useState(null);
  const [alertSymbol, setAlertSymbol] = useState("");
  const [alertDirection, setAlertDirection] = useState("ABOVE");
  const [alertTarget, setAlertTarget] = useState("");
  const [isSubmittingAlert, setIsSubmittingAlert] = useState(false);

  async function refresh() {
    try {
      const [foldersResult, alertsResult] = await Promise.all([watchlistFoldersApi.list(), priceAlertsApi.list()]);
      setFolders(foldersResult.folders || []);
      setAlerts(alertsResult.alerts || []);
      setError("");
    } catch (loadError) {
      logError("watchlist folders load failed", loadError);
      // Phase X7-RC — found live in a real browser session: this used to
      // render the raw caught error message (e.g. a backend's internal
      // "A beta user identity is required..." string) directly to the
      // screen — the exact anti-pattern PRIVATE_BETA_POLISH.md (Phase X5)
      // fixed on other screens but missed here. Always the friendly
      // fallback now; the real message is still captured by logError above.
      setError("Couldn't load your watchlist folders right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // Phase X4 — Notification Center deep-link target: opens the same
  // WorkspaceDetail modal a manual "Open workspace" click does.
  useEffect(() => {
    function handleOpenWorkspaceDetail(event) {
      setWorkspaceDetailFolderId(event.detail);
    }
    window.addEventListener(OPEN_WORKSPACE_DETAIL_EVENT, handleOpenWorkspaceDetail);
    return () => window.removeEventListener(OPEN_WORKSPACE_DETAIL_EVENT, handleOpenWorkspaceDetail);
  }, []);

  async function runAction(action) {
    setActionError("");
    try {
      await action();
      await refresh();
    } catch (actionErrorValue) {
      logError("watchlist folders action failed", actionErrorValue);
      setActionError(actionErrorValue?.message || "That action didn't go through.");
    }
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    runAction(async () => {
      await watchlistFoldersApi.create(name);
      setNewFolderName("");
      trackEvent("workspace_created");
    });
  }

  function renameFolder(folder) {
    const name = window.prompt("Rename folder", folder.name);
    if (!name || !name.trim() || name.trim() === folder.name) return;
    runAction(() => watchlistFoldersApi.rename(folder.id, name.trim()));
  }

  function deleteFolder(folder) {
    if (!window.confirm(`Delete "${folder.name}"? This removes the folder and its symbols.`)) return;
    runAction(async () => {
      await watchlistFoldersApi.remove(folder.id);
      trackEvent("workspace_deleted");
    });
  }

  function addSymbol(folder) {
    const symbol = (symbolDrafts[folder.id] || "").trim();
    if (!symbol) return;
    runAction(async () => {
      await watchlistFoldersApi.addSymbol(folder.id, symbol);
      setSymbolDrafts((current) => ({ ...current, [folder.id]: "" }));
    });
  }

  function removeSymbol(folder, symbol) {
    runAction(() => watchlistFoldersApi.removeSymbol(folder.id, symbol));
  }

  function moveSymbol(folder, symbol, toFolderId) {
    if (!toFolderId || toFolderId === folder.id) return;
    runAction(() => watchlistFoldersApi.moveSymbol(folder.id, toFolderId, symbol));
  }

  function openAlertModal(folderId, symbol) {
    setAlertModalFolderId(folderId);
    setAlertSymbol(symbol);
    setAlertDirection("ABOVE");
    setAlertTarget("");
  }

  async function submitAlert() {
    const targetPrice = Number(alertTarget);
    if (!alertSymbol || !Number.isFinite(targetPrice) || targetPrice <= 0) return;
    setIsSubmittingAlert(true);
    try {
      await priceAlertsApi.create({ symbol: alertSymbol, direction: alertDirection, targetPrice });
      setAlertModalFolderId(null);
      await refresh();
    } catch (alertError) {
      logError("create alert failed", alertError);
      setActionError("Couldn't create that alert.");
    } finally {
      setIsSubmittingAlert(false);
    }
  }

  function deactivateAlert(alertId) {
    runAction(() => priceAlertsApi.deactivate(alertId));
  }

  function deleteAlert(alertId) {
    runAction(() => priceAlertsApi.remove(alertId));
  }

  if (isLoading) {
    return (
      <div className="screen-page">
        <SectionCard title="Watchlist Folders" className="screen-card">
          <LoadingSpinner label="Loading your folders" />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Command Center — Watchlists</p>
          <h1>Watchlist Folders &amp; Price Alerts</h1>
          <p className="subtext">
            Organize what you're watching into folders (e.g. {EXAMPLE_FOLDER_NAMES.join(", ")}), then set live-price alerts on
            any symbol. Alerts here are yours alone — isolated per beta user.
          </p>
        </div>
      </section>

      {error ? <ErrorState message={error} /> : null}
      {actionError ? <p className="company-description negative">{actionError}</p> : null}

      <SectionCard title="Create a folder" className="screen-card">
        <div className="onboarding-numeric-step" style={{ maxWidth: 360 }}>
          <Input
            type="text"
            placeholder="Folder name (e.g. AI)"
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createFolder()}
          />
          <Button type="button" className="primary-action" onClick={createFolder}>Create folder</Button>
        </div>
      </SectionCard>

      {folders.length ? (
        <div className="folder-grid">
          {folders.map((folder) => (
            <div key={folder.id} className="panel-card folder-card">
              <div className="folder-card__header">
                <h3>{folder.name}</h3>
                <div className="folder-symbol-row__actions">
                  <Button type="button" className="ghost-button" onClick={() => setWorkspaceDetailFolderId(folder.id)}>Open workspace</Button>
                  <Button type="button" className="ghost-button" onClick={() => renameFolder(folder)}>Rename</Button>
                  <Button type="button" className="ghost-button" onClick={() => deleteFolder(folder)}>Delete</Button>
                </div>
              </div>

              <div className="folder-card__symbols">
                {folder.items?.length ? (
                  folder.items.map((item) => (
                    <div key={item.symbol} className="folder-symbol-row">
                      <button type="button" className="ghost-button" onClick={() => openSymbolPanel(item.symbol)}>
                        <strong>{item.symbol}</strong>
                      </button>
                      <div className="folder-symbol-row__actions">
                        <Button type="button" className="ghost-button" onClick={() => openAlertModal(folder.id, item.symbol)}>
                          Set alert
                        </Button>
                        {folders.length > 1 ? (
                          <select
                            aria-label={`Move ${item.symbol} to another folder`}
                            className="language-select"
                            defaultValue=""
                            onChange={(event) => moveSymbol(folder, item.symbol, event.target.value)}
                          >
                            <option value="" disabled>Move to...</option>
                            {folders.filter((candidate) => candidate.id !== folder.id).map((candidate) => (
                              <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                            ))}
                          </select>
                        ) : null}
                        <Button type="button" className="ghost-button" onClick={() => removeSymbol(folder, item.symbol)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="company-description subtle">No symbols yet.</p>
                )}
              </div>

              <div className="onboarding-numeric-step">
                <Input
                  type="text"
                  placeholder="Add symbol (e.g. NVDA)"
                  value={symbolDrafts[folder.id] || ""}
                  onChange={(event) => setSymbolDrafts((current) => ({ ...current, [folder.id]: event.target.value.toUpperCase() }))}
                  onKeyDown={(event) => event.key === "Enter" && addSymbol(folder)}
                />
                <Button type="button" className="ghost-button" onClick={() => addSymbol(folder)}>Add</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="◎"
          title="No folders yet"
          message="Create your first folder above — try AI, Long Term, Waiting for Entry, or Space and Defense."
        />
      )}

      <SectionCard title="Price Alerts" subtitle="Live price, checked automatically every few minutes" className="screen-card">
        {alerts.length ? (
          <div className="folder-card__symbols">
            {alerts.map((alert) => (
              <div key={alert.id} className={`alert-row${alert.status === "TRIGGERED" ? " alert-row--triggered" : ""}`}>
                <span className={alert.status === "TRIGGERED" ? "pill opportunity" : alert.status === "INACTIVE" ? "pill" : "pill monitor"}>
                  {alert.status}
                </span>
                <span>
                  <strong>{alert.symbol}</strong> {alert.direction === "ABOVE" ? "rises above" : "falls below"}{" "}
                  <span className="alert-row__price">${Number(alert.targetPrice).toFixed(2)}</span>
                  {alert.currentPrice !== null ? (
                    <span className="company-description subtle">
                      {" "}— now <span className="alert-row__price">${alert.currentPrice.toFixed(2)}</span>
                      {alert.distanceFromTarget !== null ? ` (${alert.distanceFromTarget >= 0 ? "+" : ""}${alert.distanceFromTarget.toFixed(2)})` : ""}
                    </span>
                  ) : (
                    <span className="company-description subtle"> — live price unavailable right now</span>
                  )}
                  {alert.status === "TRIGGERED" ? (
                    <span className="company-description subtle">
                      {" "}— triggered {new Date(alert.triggeredAt).toLocaleString()} at ${Number(alert.triggerPrice).toFixed(2)}
                    </span>
                  ) : null}
                </span>
                <span>
                  {alert.status === "ACTIVE" ? (
                    <Button type="button" className="ghost-button" onClick={() => deactivateAlert(alert.id)}>Deactivate</Button>
                  ) : null}
                </span>
                <span>
                  <Button type="button" className="ghost-button" onClick={() => deleteAlert(alert.id)}>Delete</Button>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No price alerts yet — set one from any symbol in a folder above." />
        )}
      </SectionCard>

      {alertModalFolderId ? (
        <Modal title={`Set a price alert — ${alertSymbol}`} onClose={() => setAlertModalFolderId(null)}>
          <div className="onboarding-numeric-step">
            <select className="language-select" value={alertDirection} onChange={(event) => setAlertDirection(event.target.value)}>
              <option value="ABOVE">Price rises above</option>
              <option value="BELOW">Price falls below</option>
            </select>
            <Input
              type="number"
              placeholder="Target price"
              value={alertTarget}
              onChange={(event) => setAlertTarget(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && submitAlert()}
            />
            <Button type="button" className="primary-action" onClick={submitAlert} disabled={isSubmittingAlert}>
              {isSubmittingAlert ? "Creating..." : "Create alert"}
            </Button>
          </div>
        </Modal>
      ) : null}

      {workspaceDetailFolderId ? (
        <WorkspaceDetail folderId={workspaceDetailFolderId} onClose={() => setWorkspaceDetailFolderId(null)} />
      ) : null}
    </div>
  );
}
