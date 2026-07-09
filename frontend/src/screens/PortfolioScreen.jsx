import SectionCard from "../components/SectionCard";

const holdings = [
  { name: "Growth Leaders", value: "$520K", allocation: "42%" },
  { name: "Energy Transition", value: "$310K", allocation: "25%" },
  { name: "Defensive Income", value: "$240K", allocation: "19%" },
  { name: "Cash Reserve", value: "$170K", allocation: "14%" },
];

export default function PortfolioScreen() {
  return (
    <div className="screen-page">
      <section className="screen-hero">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>Your allocation strategy, simplified</h1>
          <p className="subtext">
            Review the composition of your capital across growth, income, and resilience.
          </p>
        </div>
      </section>

      <div className="portfolio-grid">
        {holdings.map((holding) => (
          <SectionCard key={holding.name} title={holding.name} subtitle="Mock allocation" className="screen-card">
            <div className="portfolio-metric">{holding.value}</div>
            <div className="portfolio-metric__label">Allocation {holding.allocation}</div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
