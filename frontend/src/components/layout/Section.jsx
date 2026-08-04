// Phase X12B — NOVA Foundation, Part 4. A major page section — the
// 48px-between-sections rhythm from NOVA_DESIGN_BIBLE.md §6, applied via
// layout.css's .nova-section, never a one-off margin value per screen.
export default function Section({ children, as: Tag = "section", className = "", ...rest }) {
  return (
    <Tag className={`nova-section ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
