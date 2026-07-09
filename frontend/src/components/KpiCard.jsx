export default function KpiCard({ title, value, detail, tone = "neutral" }) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-card__label">{title}</div>
      <div className="kpi-card__value">{value}</div>
      <div className="kpi-card__detail">{detail}</div>
    </article>
  );
}
