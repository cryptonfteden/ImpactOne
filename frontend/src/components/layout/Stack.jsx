// Phase X12B — NOVA Foundation, Part 4. The one reusable flex-with-gap
// primitive — direction/align/justify/wrap are data-attributes (see
// layout.css's [data-direction]/[data-align]/[data-justify]/[data-wrap]
// selectors) and `gap` is always a real tokens.css spacing value, never
// a raw px number, so a Stack can never introduce an off-grid spacing
// value.
const SPACE_TOKEN = {
  1: "var(--nova-space-1)",
  2: "var(--nova-space-2)",
  3: "var(--nova-space-3)",
  4: "var(--nova-space-4)",
  6: "var(--nova-space-6)",
  8: "var(--nova-space-8)",
  12: "var(--nova-space-12)",
  16: "var(--nova-space-16)",
  24: "var(--nova-space-24)",
};

export default function Stack({
  children,
  direction = "vertical",
  align = "stretch",
  justify = "start",
  gap = 4,
  wrap = false,
  className = "",
  style,
  ...rest
}) {
  return (
    <div
      className={`nova-stack ${className}`.trim()}
      data-direction={direction}
      data-align={align}
      data-justify={justify}
      data-wrap={wrap ? "wrap" : undefined}
      style={{ gap: SPACE_TOKEN[gap] || SPACE_TOKEN[4], ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
