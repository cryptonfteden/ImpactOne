import KpiCard from "./KpiCard";
import WatchlistTable from "./WatchlistTable";
import AIInsightsSidebar from "./AIInsightsSidebar";

const kpiItems = [
  {
    title: "Market Sentiment",
    value: "+82%",
    detail: "Risk-on, bullish momentum",
    tone: "positive",
  },
  {
    title: "AI Score",
    value: "9.4/10",
    detail: "High-conviction opportunities",
    tone: "accent",
  },
  {
    title: "Portfolio Value",
    value: "$1.24M",
    detail: "Up 11.8% this month",
    tone: "positive",
  },
  {
    title: "Today’s Opportunities",
    value: "14",
    detail: "3 new signals flagged",
    tone: "neutral",
  },
];

const heatmapItems = [
  { label: "AI Infra", value: "+8.2%", tone: "up" },
  { label: "BioTech", value: "+5.7%", tone: "up" },
  { label: "Fintech", value: "+3.6%", tone: "up" },
  { label: "Energy", value: "-1.1%", tone: "down" },
  { label: "Defense", value: "+2.4%", tone: "up" },
  { label: "Consumer", value: "+4.0%", tone: "up" },
  { label: "Cloud", value: "+6.4%", tone: "up" },
  { label: "Semis", value: "+1.8%", tone: "up" },
];

const newsItems = [
  { icon: "🤖", title: "AI Capex cycle remains intact", blurb: "Enterprise budgets continue to expand across cloud and inference layers." },
  { icon: "📈", title: "Growth leaders outperform defensives", blurb: "Quality growth remains the dominant leadership theme in July." },
  { icon: "🌍", title: "Impact themes attract fresh capital", blurb: "Climate and health innovation names are seeing stronger inflows." },
];

const signals = [
  { time: "09:20", title: "Momentum confirms", detail: "NVDA breaking above key resistance" },
  { time: "11:05", title: "Risk score improved", detail: "PLTR showing stronger breadth" },
  { time: "14:40", title: "Earnings watch", detail: "AMD setup favors a bullish bias" },
];

const movers = [
  { name: "NVDA", change: "+3.5%", note: "Momentum" },
  { name: "PLTR", change: "+2.1%", note: "Breakout" },
  { name: "AMD", change: "+1.8%", note: "Watch" },
];

const earnings = [
  { symbol: "AMD", date: "Tomorrow", time: "After close" },
  { symbol: "SHOP", date: "Wed", time: "Before open" },
  { symbol: "COIN", date: "Fri", time: "After close" },
];

export default function DashboardHome() {
  return (
    <main className="dashboard-content">
      <section className="hero-panel hero-panel--featured">
        <div className="hero-copy">
          <p className="eyebrow">ImpactOne Intelligence</p>
          <h1>Invest like a modern platform, not a spreadsheet.</h1>
          <p className="subtext">
            Review market signals, track your watchlist, and act on AI-guided opportunities from one premium workspace.
          </p>
          <div className="hero-actions">
            <button className="primary-action" type="button">
              + Create Alert
            </button>
            <button className="ghost-button" type="button">
              View Briefing
            </button>
          </div>
        </div>

        <div className="hero-metrics">
          <div className="hero-metric glass-card">
            <span className="hero-metric__label">AI Edge</span>
            <strong>94%</strong>
            <small>signal confidence</small>
          </div>
          <div className="hero-metric glass-card">
            <span className="hero-metric__label">Market Pulse</span>
            <strong>Risk-on</strong>
            <small>uptrend intact</small>
          </div>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Key performance indicators">
        {kpiItems.map((item) => (
          <KpiCard key={item.title} {...item} />
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--premium">
        <div className="dashboard-stack">
          <section className="panel-card glass-card opportunity-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">AI Opportunity of the Day</p>
                <h3>Enterprise AI infrastructure</h3>
              </div>
              <span className="pill pill--strong">High Conviction</span>
            </div>
            <p className="opportunity-card__text">
              Data center demand, enterprise AI spend, and improving pricing power create a compelling entry point for leaders in compute and cloud infrastructure.
            </p>
            <div className="opportunity-card__footer">
              <span>Target: $142</span>
              <span>Risk: Moderate</span>
              <span>Time Horizon: 3–6 months</span>
            </div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Market Heatmap</p>
                <h3>Sector rotation</h3>
              </div>
            </div>
            <div className="heatmap-grid">
              {heatmapItems.map((item) => (
                <div key={item.label} className={`heatmap-tile ${item.tone}`}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">News Feed</p>
                <h3>What moved the market</h3>
              </div>
            </div>
            <div className="news-list">
              {newsItems.map((item) => (
                <article key={item.title} className="news-item news-item--premium">
                  <div className="news-item__icon">{item.icon}</div>
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.blurb}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Recent AI Signals</p>
                <h3>Signal timeline</h3>
              </div>
            </div>
            <div className="timeline">
              {signals.map((signal) => (
                <div key={signal.time} className="timeline-item">
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-time">{signal.time}</div>
                    <h4>{signal.title}</h4>
                    <p>{signal.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="dashboard-stack">
          <section className="panel-card glass-card chart-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Portfolio Performance</p>
                <h3>Growth curve</h3>
              </div>
            </div>
            <svg viewBox="0 0 300 120" className="chart-svg" aria-label="portfolio performance chart">
              <path d="M0 100 C35 85, 65 70, 95 72 S155 96, 190 72 S245 38, 300 42" fill="none" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
              <circle cx="190" cy="72" r="5" fill="#f8fafc" />
              <circle cx="300" cy="42" r="5" fill="#34d399" />
            </svg>
            <div className="chart-caption">+14.2% versus benchmark</div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Market Read</p>
                <h3>Fear & Greed</h3>
              </div>
            </div>
            <div className="meter-row">
              <div className="meter">
                <div className="meter-fill meter-fill--greed" style={{ width: "72%" }} />
              </div>
              <span className="meter-value">72 / 100</span>
            </div>
            <div className="panel-card__header panel-card__header--tight">
              <div>
                <p className="panel-card__eyebrow">AI Confidence</p>
                <h3>Confidence meter</h3>
              </div>
            </div>
            <div className="meter-row">
              <div className="meter">
                <div className="meter-fill meter-fill--confidence" style={{ width: "91%" }} />
              </div>
              <span className="meter-value">91%</span>
            </div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Earnings Calendar</p>
                <h3>Upcoming releases</h3>
              </div>
            </div>
            <div className="earnings-list">
              {earnings.map((item) => (
                <div key={item.symbol} className="earnings-item">
                  <strong>{item.symbol}</strong>
                  <span>{item.date}</span>
                  <small>{item.time}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="panel-card glass-card">
            <div className="panel-card__header">
              <div>
                <p className="panel-card__eyebrow">Top Movers</p>
                <h3>Momentum leaders</h3>
              </div>
            </div>
            <div className="mover-grid">
              {movers.map((mover) => (
                <div key={mover.name} className="mover-card">
                  <strong>{mover.name}</strong>
                  <span>{mover.change}</span>
                  <small>{mover.note}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <section className="dashboard-grid">
        <WatchlistTable />
        <AIInsightsSidebar />
      </section>

      <button className="assistant-fab" type="button" aria-label="Open AI assistant">
        ✦
      </button>
    </main>
  );
}
