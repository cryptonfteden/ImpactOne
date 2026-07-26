// Phase X12B — NOVA Foundation, Part 4. Centers content and caps it at
// tokens.css's --nova-breakpoint-container-max (1440px), with the real
// responsive inline padding defined in layout.css. Uses margin-inline/
// padding-inline (logical properties) so it mirrors correctly in RTL.
export default function Container({ children, className = "", ...rest }) {
  return (
    <div className={`nova-container ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}
