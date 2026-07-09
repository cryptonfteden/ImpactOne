import SectionCard from "../components/SectionCard";

const alerts = [
  { title: "Breakout alert", detail: "NVDA approaching resistance after strong earnings momentum." },
  { title: "Risk alert", detail: "Semiconductor volatility rising ahead of macro release." },
  { title: "Opportunity alert", detail: "Clean energy names showing improved relative strength." },
];

export default function AlertsScreen() {
  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1>Signals that need your attention</h1>
          <p className="subtext">
            Keep your workflow focused on the moves that matter most.
          </p>
        </div>
      </section>

      <SectionCard title="Active alerts" subtitle="Mock monitoring feed" className="screen-card">
        <div className="alert-list">
          {alerts.map((alert) => (
            <article key={alert.title} className="alert-item">
              <h4>{alert.title}</h4>
              <p>{alert.detail}</p>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
