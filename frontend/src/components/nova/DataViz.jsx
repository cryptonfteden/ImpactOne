// Phase X12C.0 — NOVA Showcase. Table, Heatmap, Tooltip, Legend — the
// data-visualization primitives from NOVA_DESIGN_BIBLE.md §7/§10. Charts
// themselves are explicitly a mission-named PLACEHOLDER (real candlestick
// charts are Section 10's future work, not this phase's scope).
export function Table({ columns, rows }) {
  return (
    <table className="nova-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} data-align={column.align}>
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          // eslint-disable-next-line react/no-array-index-key
          <tr key={row.id ?? rowIndex}>
            {columns.map((column) => (
              <td key={column.key} data-align={column.align}>
                {row[column.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function heatCellColor(value) {
  // Diverging Rose → surface → Emerald, anchored at the same semantic
  // colors used everywhere else in the product — never a rainbow scale.
  if (value > 0) return `color-mix(in srgb, var(--nova-color-positive) ${Math.min(100, value)}%, var(--nova-surface-3))`;
  if (value < 0) return `color-mix(in srgb, var(--nova-color-negative) ${Math.min(100, Math.abs(value))}%, var(--nova-surface-3))`;
  return "var(--nova-surface-3)";
}

export function Heatmap({ cells }) {
  return (
    <div className="nova-heatmap">
      {cells.map((cell) => (
        <div key={cell.label} className="nova-heatmap__cell" style={{ backgroundColor: heatCellColor(cell.value) }} title={`${cell.label}: ${cell.value}%`}>
          {cell.label}
        </div>
      ))}
    </div>
  );
}

export function ChartPlaceholder({ label = "Chart" }) {
  return (
    <div
      className="nova-placeholder-field"
      style={{ blockSize: 160, alignItems: "center", justifyContent: "center" }}
      role="img"
      aria-label={`${label} placeholder — real chart not yet implemented`}
    >
      {label} — chart rendering not yet implemented
    </div>
  );
}

export function Tooltip({ label, children }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
      <span className="nova-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}

export function Legend({ items }) {
  return (
    <div className="nova-legend">
      {items.map((item) => (
        <span key={item.label}>
          <span className="nova-legend__swatch" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
