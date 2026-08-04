// Phase X12C.0 — NOVA Showcase. Toast, Alert, Banner, Inline message —
// all four share the same tone vocabulary (success/warning/error/info),
// same as every other semantic-state component in the library.
export function Toast({ tone = "info", children }) {
  return (
    <div className="nova-toast" data-tone={tone} role="status">
      {children}
    </div>
  );
}

export function Alert({ tone = "info", title, children }) {
  return (
    <div className="nova-alert" data-tone={tone} role="alert">
      <div>
        {title ? <strong className="nova-text-sm">{title}</strong> : null}
        <div className="nova-text-sm">{children}</div>
      </div>
    </div>
  );
}

export function Banner({ tone = "info", children }) {
  return (
    <div className="nova-banner" data-tone={tone} role="status">
      {children}
    </div>
  );
}

export function InlineMessage({ tone = "info", children }) {
  return (
    <div className="nova-inline-message" data-tone={tone}>
      {children}
    </div>
  );
}
