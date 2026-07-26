import { useState } from "react";
import Panel from "../layout/Panel";
import { Skeleton } from "./Loading";

// Phase X12C.0 — NOVA Showcase. Every card variant is the SAME Panel
// primitive (Part 4, X12B) plus a `data-variant` marker — never a
// separately-implemented component per variant, per the mission's "No
// duplicated components" rule.
const ELEVATION_FOR_VARIANT = {
  glass: "glass",
};

export default function Card({ children, variant = "default", eyebrow, title, meta, className = "", expandable = false, loading = false, ...rest }) {
  const [expanded, setExpanded] = useState(false);
  const elevation = ELEVATION_FOR_VARIANT[variant] || "1";

  if (loading) {
    return (
      <Panel elevation="1" className={`nova-card nova-card--loading ${className}`.trim()}>
        <Skeleton height={16} width="40%" />
        <Skeleton height={28} width="70%" />
        <Skeleton height={14} width="90%" />
      </Panel>
    );
  }

  return (
    <Panel elevation={elevation} className={`nova-card ${className}`.trim()} data-variant={variant} {...rest}>
      {(eyebrow || meta) && (
        <div className="nova-card__eyebrow">
          {eyebrow ? <span className="nova-heading-eyebrow">{eyebrow}</span> : <span />}
          {meta ? <span className="nova-text-xs" style={{ color: "var(--nova-color-text-tertiary)" }}>{meta}</span> : null}
        </div>
      )}
      {title ? <h3 className="nova-heading-h1" style={{ fontSize: "var(--nova-font-size-lg)" }}>{title}</h3> : null}
      {expandable ? (
        <>
          <div>{expanded ? children : <div style={{ maxBlockSize: 60, overflow: "hidden" }}>{children}</div>}</div>
          <button type="button" className="nova-button" data-variant="ghost" data-size="compact" onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less" : "Show more"}
          </button>
        </>
      ) : (
        children
      )}
    </Panel>
  );
}
