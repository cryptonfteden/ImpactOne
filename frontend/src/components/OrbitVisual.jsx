/** CSS-only dimensional visual. It has no market values; application data stays authoritative. */
export default function OrbitVisual({ variant = "default", label = "Live intelligence visual" }) {
  return (
    <div className={`orbit-visual orbit-visual--${variant}`} aria-label={label} role="img">
      <span className="orbit-visual__ring orbit-visual__ring--one" />
      <span className="orbit-visual__ring orbit-visual__ring--two" />
      <span className="orbit-visual__ring orbit-visual__ring--three" />
      <span className="orbit-visual__core" />
      <span className="orbit-visual__node orbit-visual__node--a" />
      <span className="orbit-visual__node orbit-visual__node--b" />
      <span className="orbit-visual__node orbit-visual__node--c" />
    </div>
  );
}
