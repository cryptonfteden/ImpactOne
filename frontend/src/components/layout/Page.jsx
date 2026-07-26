// Phase X12B — NOVA Foundation, Part 4: Layout Foundation.
// The outermost layout primitive — sets the base surface/text-color pair
// for a full screen. Not used by any existing screen yet (no redesign
// this phase); available for the future screen work Phase X12A's roadmap
// names (NOVA_DESIGN_BIBLE.md §18).
export default function Page({ children, className = "", ...rest }) {
  return (
    <div className={`nova-page ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
