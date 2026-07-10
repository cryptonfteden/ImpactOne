import { Card } from "./ui";

export default function SectionCard({ title, subtitle, icon = "", children, className = "" }) {
  return (
    <Card className={`panel-card ${className}`.trim()}>
      {(title || subtitle) && (
        <div className="panel-card__header">
          <div>
            {title && <h3>{icon ? <span className="section-title-icon" aria-hidden="true">{icon}</span> : null}{title}</h3>}
            {subtitle && <p className="panel-card__eyebrow">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="section-card__body">{children}</div>
    </Card>
  );
}
