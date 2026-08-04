// Phase X12C.0 — NOVA Showcase. The real Input family — Text, Search,
// Select, Checkbox, Radio, Toggle, Slider — one file since they share the
// same Field wrapper and validation-state language (§4 of the mission).
export function Field({ label, hint, state = "default", children, htmlFor }) {
  return (
    <div className="nova-field" data-state={state}>
      {label ? (
        <label className="nova-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <span className="nova-field__hint">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ id, placeholder, type = "text", className = "", ...rest }) {
  return <input id={id} type={type} placeholder={placeholder} className={`nova-input ${className}`.trim()} {...rest} />;
}

export function SearchInput({ id, placeholder = "Search…", className = "", ...rest }) {
  return <input id={id} type="search" placeholder={placeholder} className={`nova-input ${className}`.trim()} {...rest} />;
}

export function Select({ id, options = [], className = "", ...rest }) {
  return (
    <select id={id} className={`nova-select ${className}`.trim()} {...rest}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ id, label, ...rest }) {
  return (
    <label htmlFor={id} style={{ display: "inline-flex", alignItems: "center", gap: "var(--nova-space-2)" }}>
      <input id={id} type="checkbox" className="nova-checkbox" {...rest} />
      {label}
    </label>
  );
}

export function Radio({ id, name, label, ...rest }) {
  return (
    <label htmlFor={id} style={{ display: "inline-flex", alignItems: "center", gap: "var(--nova-space-2)" }}>
      <input id={id} type="radio" name={name} className="nova-radio" {...rest} />
      {label}
    </label>
  );
}

export function Toggle({ checked = false, onChange, "aria-label": ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      className="nova-toggle"
      data-checked={checked ? "true" : "false"}
      onClick={() => onChange?.(!checked)}
    >
      <span className="nova-toggle__thumb" />
    </button>
  );
}

export function Slider({ id, min = 0, max = 100, value, onChange, ...rest }) {
  return <input id={id} type="range" min={min} max={max} value={value} onChange={(event) => onChange?.(Number(event.target.value))} className="nova-slider" {...rest} />;
}

// A real, honest placeholder — the mission explicitly names "date picker
// placeholder," not a real date picker, so this never pretends to be
// interactive.
export function DatePickerPlaceholder() {
  return <div className="nova-placeholder-field">Date picker — not yet implemented</div>;
}
