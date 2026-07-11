import { useEffect, useState } from "react";
import { Button } from "../ui";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const HEALTH_URL = `${API_BASE.replace(/\/api\/?$/, "")}/health`;

const INERT_LINKS = ["Help", "Feedback", "Terms", "Product updates"];

/**
 * Spec §4.10 Footer Utility Area. Settings and Status are real (Status
 * pings /health). Help/Feedback/Terms/Product updates have no real
 * destination anywhere in this app yet, so they render as present-but-
 * inert labels rather than links that go nowhere.
 */
export default function DashboardFooter({ marketStatus, lastUpdated, onNavigate }) {
  const [healthStatus, setHealthStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    fetch(HEALTH_URL)
      .then((response) => (response.ok ? "healthy" : "degraded"))
      .catch(() => "degraded")
      .then((status) => {
        if (!cancelled) {
          setHealthStatus(status);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="dashboard-footer">
      <div className="dashboard-footer__status">
        <span className={`pill ${healthStatus === "healthy" ? "opportunity" : healthStatus === "degraded" ? "risk" : "monitor"}`}>
          System status: {healthStatus}
        </span>
        <span className="company-description subtle">{marketStatus || "Market status unavailable"}</span>
        <span className="company-description subtle">
          Last updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}
        </span>
      </div>
      <div className="dashboard-footer__links">
        <Button type="button" className="ghost-button" onClick={() => onNavigate?.("Settings")}>Settings</Button>
        {INERT_LINKS.map((label) => (
          <span key={label} className="dashboard-footer__inert-link" title="Not available yet">{label}</span>
        ))}
      </div>
    </footer>
  );
}
