import { memo } from "react";

/**
 * Per the MVP Home Dashboard spec's Global Loading State Rules: "Use
 * skeleton cards instead of spinners for most modules." Used across the
 * dashboard sections while their data is loading.
 */
function Skeleton({ variant = "line", count = 1, className = "" }) {
  const items = Array.from({ length: count });

  return (
    <div className={`skeleton-group ${className}`.trim()} aria-hidden="true">
      {items.map((_, index) => (
        <div key={index} className={`skeleton skeleton--${variant}`} />
      ))}
    </div>
  );
}

export default memo(Skeleton);
