// Phase X12C.0 — NOVA Showcase. A real, reusable Button — every visual
// value comes from components.css/tokens.css, nothing hardcoded here.
export default function Button({
  children,
  variant = "primary",
  size = "default",
  loading = false,
  disabled = false,
  iconOnly = false,
  className = "",
  ...rest
}) {
  return (
    <button
      type="button"
      className={`nova-button ${iconOnly ? "nova-button--icon-only" : ""} ${className}`.trim()}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : "false"}
      // Phase APPLE-QUALITY-001 — real bug fix: accessibility.css's own
      // global keyboard-focus-ring system (documented there as "so no
      // future component can accidentally ship with outline: none and
      // no replacement") is opt-in via this exact attribute — and
      // nothing in the codebase had ever actually applied it, including
      // this, the app's single most-used interactive component. Every
      // nova-button was falling back to the browser's unstyled default
      // focus outline rather than the design system's own intended ring.
      data-nova-interactive
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
      {loading ? <span className="nova-button__spinner" aria-hidden="true" /> : null}
    </button>
  );
}
