// Phase X12B — NOVA Foundation, Part 4. The 12/8/4-column responsive
// grid from NOVA_DESIGN_BIBLE.md §6 (desktop/tablet/mobile), implemented
// once in layout.css's .nova-grid so no screen redefines its own column
// count or gutter.
export default function Grid({ children, className = "", ...rest }) {
  return (
    <div className={`nova-grid ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
