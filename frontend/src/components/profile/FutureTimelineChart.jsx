// Sprint 20, Part 2 — hand-rolled SVG (no charting library, matching the
// existing PriceChart convention in AiAnalysisScreen.jsx). Plots both the
// illustrated total balance and the amount actually contributed, so the
// gap between them (the illustrated growth) is visible, not just a number.
export default function FutureTimelineChart({ yearlyBalances, currencySymbol = "$" }) {
  if (!yearlyBalances?.length || yearlyBalances.length < 2) {
    return <p className="company-description subtle">Adjust the simulator above to see your illustrated timeline.</p>;
  }

  const width = 320;
  const height = 160;
  const padding = 16;
  const maxBalance = Math.max(...yearlyBalances.map((point) => point.balance), 1);

  const toXY = (point) => {
    const x = padding + (point.year / yearlyBalances[yearlyBalances.length - 1].year) * (width - padding * 2);
    const y = height - padding - (point.balance / maxBalance) * (height - padding * 2);
    return { x, y };
  };
  const toContributedXY = (point) => {
    const x = padding + (point.year / yearlyBalances[yearlyBalances.length - 1].year) * (width - padding * 2);
    const y = height - padding - (point.contributed / maxBalance) * (height - padding * 2);
    return { x, y };
  };

  const balancePoints = yearlyBalances.map(toXY);
  const contributedPoints = yearlyBalances.map(toContributedXY);

  const balancePath = balancePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const contributedPath = contributedPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const areaPath = `${balancePath} L ${balancePoints[balancePoints.length - 1].x.toFixed(2)} ${height - padding} L ${balancePoints[0].x.toFixed(2)} ${height - padding} Z`;

  const lastYear = yearlyBalances[yearlyBalances.length - 1];

  return (
    <div className="chart-card timeline-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="timeline-chart__svg" role="img" aria-label="Illustrated future value over time">
        <path d={areaPath} className="timeline-chart__area" />
        <path d={contributedPath} className="timeline-chart__contributed-line" />
        <path d={balancePath} className="timeline-chart__balance-line" />
      </svg>
      <div className="timeline-chart__legend">
        <span className="timeline-chart__legend-item timeline-chart__legend-item--balance">Illustrated total</span>
        <span className="timeline-chart__legend-item timeline-chart__legend-item--contributed">Amount contributed</span>
      </div>
      <p className="company-description subtle">
        By year {lastYear.year}: {currencySymbol}
        {lastYear.balance.toLocaleString()} illustrated total ({currencySymbol}
        {lastYear.contributed.toLocaleString()} contributed).
      </p>
    </div>
  );
}
