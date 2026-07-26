import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import NotificationCenter from "./NotificationCenter";
import { notificationsApi } from "../services/api";
import { NAVIGATE_WORKSPACE_EVENT, NAVIGATE_DECISION_CENTER_EVENT } from "../utils/navigation";

vi.mock("../services/api", () => ({
  notificationsApi: { list: vi.fn(), markRead: vi.fn(), pin: vi.fn(), unpin: vi.fn(), clear: vi.fn() },
}));

const NOTIFICATION_FIXTURE = {
  id: "notif-1",
  symbol: "AAPL",
  message: "AAPL rose above your target of $300.00 — now $310.00.",
  isRead: false,
  isPinned: false,
  workspace: { id: "folder-1", name: "AI" },
  deepLink: { symbol: "AAPL", workspaceId: "folder-1" },
  triggeredAt: "2026-07-23T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

async function openPanel(unreadLabel = "Open notifications, 1 unread") {
  await waitFor(() => expect(screen.getByLabelText(unreadLabel)).toBeInTheDocument());
  fireEvent.click(screen.getByLabelText(unreadLabel));
}

describe("NotificationCenter", () => {
  it("shows an unread badge with the real unread count", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    render(<NotificationCenter />);
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("opening the panel shows the real triggered-alert message, symbol, and trigger time", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    render(<NotificationCenter />);
    await openPanel();

    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText(NOTIFICATION_FIXTURE.message)).toBeInTheDocument();
  });

  it("mark as read calls the real API and updates the badge", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    notificationsApi.markRead.mockResolvedValue({ ...NOTIFICATION_FIXTURE, isRead: true });
    render(<NotificationCenter />);
    await openPanel();

    fireEvent.click(screen.getByText("Mark as read"));

    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith("notif-1"));
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("clear calls the real API and removes the notification from the list", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    notificationsApi.clear.mockResolvedValue({});
    render(<NotificationCenter />);
    await openPanel();

    fireEvent.click(screen.getByText("Clear"));

    await waitFor(() => expect(notificationsApi.clear).toHaveBeenCalledWith("notif-1"));
    await waitFor(() => expect(screen.queryByText("AAPL")).not.toBeInTheDocument());
  });

  it("shows an honest empty state with no notifications", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [], unreadCount: 0, pinnedCount: 0, grouped: null });
    render(<NotificationCenter />);
    await waitFor(() => expect(screen.getByLabelText("Open notifications")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Open notifications"));
    expect(screen.getByText(/No notifications yet/)).toBeInTheDocument();
  });

  it("pinning calls the real pin endpoint and reflects pinned state", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    notificationsApi.pin.mockResolvedValue({ ...NOTIFICATION_FIXTURE, isPinned: true });
    render(<NotificationCenter />);
    await openPanel();

    fireEvent.click(screen.getByText("Pin"));
    await waitFor(() => expect(notificationsApi.pin).toHaveBeenCalledWith("notif-1"));
    expect(screen.getByText("Unpin")).toBeInTheDocument();
  });

  it("choosing a group mode re-requests real grouped data and renders real group headers", async () => {
    notificationsApi.list.mockResolvedValue({
      notifications: [NOTIFICATION_FIXTURE],
      unreadCount: 1,
      pinnedCount: 0,
      grouped: null,
    });
    render(<NotificationCenter />);
    await openPanel();

    notificationsApi.list.mockResolvedValue({
      notifications: [NOTIFICATION_FIXTURE],
      unreadCount: 1,
      pinnedCount: 0,
      grouped: { AI: [NOTIFICATION_FIXTURE] },
    });
    fireEvent.click(screen.getByRole("button", { name: "By workspace" }));

    await waitFor(() => expect(notificationsApi.list).toHaveBeenLastCalledWith({ groupBy: "workspace" }));
    await waitFor(() => expect(screen.getByText("AI")).toBeInTheDocument());
  });

  it("a tracked notification's workspace deep-link dispatches the real navigate-workspace event", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    const handler = vi.fn();
    window.addEventListener(NAVIGATE_WORKSPACE_EVENT, handler);
    render(<NotificationCenter />);
    await openPanel();

    fireEvent.click(screen.getByText("Open in AI"));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toBe("folder-1");
    window.removeEventListener(NAVIGATE_WORKSPACE_EVENT, handler);
  });

  it("an untracked notification honestly shows no workspace link", async () => {
    const untracked = { ...NOTIFICATION_FIXTURE, workspace: null, deepLink: { symbol: "AAPL", workspaceId: null } };
    notificationsApi.list.mockResolvedValue({ notifications: [untracked], unreadCount: 1, pinnedCount: 0, grouped: null });
    render(<NotificationCenter />);
    await openPanel();

    expect(screen.getByText("Untracked — not in any workspace")).toBeInTheDocument();
    expect(screen.queryByText(/Open in/)).not.toBeInTheDocument();
  });

  it("view in Decision Center dispatches the real navigate-decision-center event", async () => {
    notificationsApi.list.mockResolvedValue({ notifications: [NOTIFICATION_FIXTURE], unreadCount: 1, pinnedCount: 0, grouped: null });
    const handler = vi.fn();
    window.addEventListener(NAVIGATE_DECISION_CENTER_EVENT, handler);
    render(<NotificationCenter />);
    await openPanel();

    fireEvent.click(screen.getByText("View in Decision Center"));
    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(NAVIGATE_DECISION_CENTER_EVENT, handler);
  });
});
