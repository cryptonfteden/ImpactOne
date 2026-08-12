import { memo, useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import { notificationsApi } from "../services/api";
import { logError } from "../utils/errorHandling";
import { startVisibilityAwarePolling } from "../utils/pollWhileVisible";
import { openSymbolPanel } from "../utils/symbolPanel";
import { navigateToWorkspace, navigateToDecisionCenter } from "../utils/navigation";
import { trackEvent } from "../utils/analytics";

const GROUP_MODES = [
  { key: "", label: "All" },
  { key: "day", label: "By day" },
  { key: "workspace", label: "By workspace" },
  { key: "symbol", label: "By symbol" },
];

function formatTriggerTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function formatGroupKey(groupBy, key) {
  if (groupBy !== "day") return key;
  const date = new Date(`${key}T00:00:00`);
  return Number.isNaN(date.getTime()) ? key : date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function NotificationRow({ notification, onMarkRead, onPin, onClear }) {
  return (
    <div className={`notification-item${notification.isRead ? "" : " notification-item--unread"}`}>
      <div className="notification-item__top">
        <button
          type="button"
          className="ghost-button"
          onClick={() => {
            trackEvent("notification_clicked", { symbol: notification.symbol, notificationId: notification.id });
            openSymbolPanel(notification.deepLink.symbol);
          }}
        >
          <strong>{notification.symbol}</strong>
        </button>
        {notification.isPinned ? <span className="pill">Pinned</span> : null}
        <span className="company-description subtle">{formatTriggerTime(notification.triggeredAt)}</span>
      </div>
      <p className="company-description">{notification.message}</p>
      {notification.deepLink.workspaceId ? (
        <button type="button" className="ghost-button" onClick={() => navigateToWorkspace(notification.deepLink.workspaceId)}>
          Open in {notification.workspace?.name || "workspace"}
        </button>
      ) : (
        <span className="company-description subtle">Untracked — not in any workspace</span>
      )}
      <div className="notification-item__actions">
        {!notification.isRead ? (
          <Button type="button" className="ghost-button" onClick={() => onMarkRead(notification.id)}>
            Mark as read
          </Button>
        ) : null}
        <Button type="button" className="ghost-button" onClick={() => onPin(notification.id, notification.isPinned)}>
          {notification.isPinned ? "Unpin" : "Pin"}
        </Button>
        <Button type="button" className="ghost-button" onClick={() => navigateToDecisionCenter()}>
          View in Decision Center
        </Button>
        <Button type="button" className="ghost-button" onClick={() => onClear(notification.id)}>
          Clear
        </Button>
      </div>
    </div>
  );
}

/**
 * Phase H3 — In-App Notification Center, extended in Phase X4 to a
 * timeline-based Professional Notification Center: real day/workspace/
 * symbol grouping, real persisted pin state, and deep-links into Chart
 * (existing symbol panel), Workspace (WorkspaceDetail modal), and
 * Decision Center. Every triggered price-alert notification remains real
 * — nothing here is fabricated. Isolated per beta user via the same
 * X-Beta-User-Id header every other request carries.
 */
function NotificationCenter() {
  const rootRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [grouped, setGrouped] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("");

  useEffect(() => {
    function closeWhenAnotherOverlayOpens(event) {
      if (event.detail !== "notifications") setIsOpen(false);
    }
    function closeOnOutsidePointer(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) setIsOpen(false);
    }
    function closeOnEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("impactone:header-overlay-open", closeWhenAnotherOverlayOpens);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("impactone:header-overlay-open", closeWhenAnotherOverlayOpens);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function togglePanel() {
    setIsOpen((current) => {
      const next = !current;
      if (next) window.dispatchEvent(new CustomEvent("impactone:header-overlay-open", { detail: "notifications" }));
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await notificationsApi.list({ groupBy: groupBy || undefined });
        if (!cancelled) {
          setNotifications(result.notifications || []);
          setGrouped(result.grouped || null);
          setUnreadCount(result.unreadCount || 0);
          setPinnedCount(result.pinnedCount || 0);
          setError("");
        }
      } catch (loadError) {
        logError("notification list load failed", loadError);
        if (!cancelled) setError("Couldn't load notifications right now.");
      }
    }

    load();
    const stopPolling = startVisibilityAwarePolling(load, 60000);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [groupBy]);

  async function handleMarkRead(id) {
    try {
      await notificationsApi.markRead(id);
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (markError) {
      logError("mark notification read failed", markError);
    }
  }

  async function handlePin(id, isPinned) {
    try {
      await (isPinned ? notificationsApi.unpin(id) : notificationsApi.pin(id));
      setNotifications((current) =>
        [...current]
          .map((item) => (item.id === id ? { ...item, isPinned: !isPinned } : item))
          .sort((a, b) => Number(b.isPinned) - Number(a.isPinned))
      );
      setPinnedCount((current) => Math.max(0, current + (isPinned ? -1 : 1)));
    } catch (pinError) {
      logError("pin notification failed", pinError);
    }
  }

  async function handleClear(id) {
    try {
      await notificationsApi.clear(id);
      setNotifications((current) => {
        const target = current.find((item) => item.id === id);
        if (target && !target.isRead) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return current.filter((item) => item.id !== id);
      });
    } catch (clearError) {
      logError("clear notification failed", clearError);
    }
  }

  const rowProps = { onMarkRead: handleMarkRead, onPin: handlePin, onClear: handleClear };

  return (
    <div className="header-menu" ref={rootRef}>
      <Button
        type="button"
        className="header-icon-button notification-bell"
        onClick={togglePanel}
        aria-label={unreadCount ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
      >
        📣
        {unreadCount > 0 ? <span className="notification-bell__badge">{unreadCount}</span> : null}
      </Button>
      {isOpen ? (
        <div className="panel-card notification-panel">
          <div className="panel-card__header">
            <div>
              <h3>Notifications</h3>
              <p className="panel-card__eyebrow">
                Triggered price alerts{pinnedCount ? ` — ${pinnedCount} pinned` : ""}
              </p>
            </div>
            <Button type="button" className="notification-panel__close" onClick={() => setIsOpen(false)} aria-label="Close notifications">×</Button>
          </div>
          <div className="decision-filters" role="group" aria-label="Group notifications">
            {GROUP_MODES.map((mode) => (
              <Button key={mode.key || "all"} type="button" className={`ghost-button${groupBy === mode.key ? " active" : ""}`} onClick={() => setGroupBy(mode.key)}>
                {mode.label}
              </Button>
            ))}
          </div>
          {error ? <p className="company-description negative">{error}</p> : null}
          {notifications.length ? (
            grouped ? (
              Object.entries(grouped).map(([key, items]) => (
                <div key={key}>
                  <p className="panel-card__eyebrow">{formatGroupKey(groupBy, key)}</p>
                  {items.map((notification) => (
                    <NotificationRow key={notification.id} notification={notification} {...rowProps} />
                  ))}
                </div>
              ))
            ) : (
              notifications.map((notification) => <NotificationRow key={notification.id} notification={notification} {...rowProps} />)
            )
          ) : (
            <p className="company-description subtle">No notifications yet — alerts you set on watchlist folders will appear here once triggered.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default memo(NotificationCenter);
