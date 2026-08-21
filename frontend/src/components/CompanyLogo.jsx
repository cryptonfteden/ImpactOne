import { useState } from "react";
import { API_BASE_URL } from "../config/apiConfig";

export default function CompanyLogo({ symbol, name = "", size = "medium", className = "" }) {
  const normalized = String(symbol || "").trim().toUpperCase();
  const [failed, setFailed] = useState(false);
  const initials = normalized.slice(0, 2) || "?";
  return (
    <span className={`company-symbol-logo company-symbol-logo--${size} ${className}`.trim()} aria-hidden="true">
      {!failed && normalized ? <img src={`${API_BASE_URL}/company-logo/${encodeURIComponent(normalized)}`} alt="" loading="lazy" onError={() => setFailed(true)} /> : null}
      <b>{initials}</b>
    </span>
  );
}
