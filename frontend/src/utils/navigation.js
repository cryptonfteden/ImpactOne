// Phase X4 — Notification Center deep-links. Same established
// window-CustomEvent pattern as symbolPanel.js's "open the chart panel
// in place" mechanism, extended to the two other real navigable
// destinations a notification can point at: a workspace folder (opened
// via WatchlistFoldersScreen's existing WorkspaceDetail modal) and the
// Decision Center screen itself.
export const NAVIGATE_WORKSPACE_EVENT = "impactone:navigate-workspace";
export const NAVIGATE_DECISION_CENTER_EVENT = "impactone:navigate-decision-center";
export const OPEN_WORKSPACE_DETAIL_EVENT = "impactone:open-workspace-detail";

export function navigateToWorkspace(workspaceId) {
  window.dispatchEvent(new CustomEvent(NAVIGATE_WORKSPACE_EVENT, { detail: workspaceId }));
}

export function navigateToDecisionCenter() {
  window.dispatchEvent(new CustomEvent(NAVIGATE_DECISION_CENTER_EVENT));
}
