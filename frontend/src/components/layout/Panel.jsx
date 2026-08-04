// Phase X12B — NOVA Foundation, Part 4 (base surface) + Part 6 (Glass
// Foundation). The base container every future card/modal/drawer body
// composes from. `elevation` defaults to "1" (a normal surface card) —
// "glass" must be requested explicitly, never the default, per the
// mission's own "Glass must never be the default" rule.
const VALID_ELEVATIONS = new Set(["0", "1", "2", "glass"]);

export default function Panel({ children, elevation = "1", className = "", as: Tag = "div", ...rest }) {
  const resolvedElevation = VALID_ELEVATIONS.has(String(elevation)) ? String(elevation) : "1";
  return (
    <Tag className={`nova-panel ${className}`.trim()} data-elevation={resolvedElevation} {...rest}>
      {children}
    </Tag>
  );
}
