export default function SectionCard({ title, subtitle, children, className = "" }) {
  return (
    <section className={`panel-card ${className}`.trim()}>
      {(title || subtitle) && (
        <div className="panel-card__header">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p className="panel-card__eyebrow">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="section-card__body">{children}</div>
    </section>
  );
}
