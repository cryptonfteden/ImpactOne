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
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {children}
      {loading ? <span className="nova-button__spinner" aria-hidden="true" /> : null}
    </button>
  );
}
