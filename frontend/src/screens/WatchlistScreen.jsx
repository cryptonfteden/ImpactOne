import SectionCard from "../components/SectionCard";

const watchlist = [
  { symbol: "NVDA", company: "NVIDIA", sentiment: "Bullish", upside: "+12%" },
  { symbol: "PLTR", company: "Palantir", sentiment: "Positive", upside: "+7%" },
  { symbol: "SQ", company: "Block", sentiment: "Neutral", upside: "+2%" },
  { symbol: "AMZN", company: "Amazon", sentiment: "Bullish", upside: "+9%" },
];

export default function WatchlistScreen() {
  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Watchlist</p>
          <h1>High-conviction ideas at a glance</h1>
          <p className="subtext">
            Follow your rotating basket of growth and quality leaders with a clean view.
          </p>
        </div>
      </section>

      <SectionCard title="Tracked names" subtitle="Mock portfolio watchlist" className="screen-card">
        <div className="watchlist-grid">
          {watchlist.map((item) => (
            <article key={item.symbol} className="watch-item">
              <div className="watch-item__top">
                <strong>{item.symbol}</strong>
                <span className="pill">{item.sentiment}</span>
              </div>
              <div className="watch-item__company">{item.company}</div>
              <div className="watch-item__upside">Upside {item.upside}</div>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
