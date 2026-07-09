import SectionCard from "../components/SectionCard";

const newsItems = [
  {
    title: "AI infrastructure demand lifts enterprise software",
    time: "12 min ago",
    summary: "Analysts highlight accelerating spending on data centers and cloud compute capacity.",
  },
  {
    title: "Sustainable energy names rebound after policy update",
    time: "37 min ago",
    summary: "The market is rotating toward long-duration infrastructure plays with improving margins.",
  },
  {
    title: "Macro signals remain constructive for growth equities",
    time: "1 hr ago",
    summary: "Inflation prints suggest steady consumer demand and manageable rate pressure.",
  },
];

export default function MarketNewsScreen() {
  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Market Pulse</p>
          <h1>Daily news and narrative shifts</h1>
          <p className="subtext">
            Stay close to the stories moving markets, without the noise.
          </p>
        </div>
      </section>

      <div className="screen-grid">
        <SectionCard title="Top Stories" subtitle="Mock market briefing" className="screen-card">
          <div className="news-list">
            {newsItems.map((item) => (
              <article key={item.title} className="news-item">
                <div className="news-item__meta">{item.time}</div>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="What matters now" subtitle="Current theme" className="screen-card">
          <ul className="stack-list">
            <li>Rates remain sticky but not restrictive</li>
            <li>AI capex cycle supports infrastructure winners</li>
            <li>Consumer resilience keeps quality growth attractive</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
