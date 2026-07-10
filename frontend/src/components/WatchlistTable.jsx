export default function WatchlistTable({ rows = [], errorMessage = "", isLoading = false }) {
  const stocks = (rows || []).map((item) => ({
    symbol: item.symbol,
    name: item.company || item.symbol,
    price: `$${Number(item.price || 0).toFixed(2)}`,
    change: `${item.change >= 0 ? "+" : ""}${Number(item.change || 0).toFixed(2)}%`,
    aiRating: item.aiRating || "Hold",
    alert: item.alertBadge?.label || "Monitor",
  }));

  return (
    <section className="panel-card panel-card--wide">
      <div className="panel-card__header">
        <div>
          <p className="panel-card__eyebrow">Portfolio Pulse</p>
          <h3>Watchlist</h3>
        </div>
        <div className="company-description subtle">{stocks.length} tracked</div>
      </div>

      <div className="table-wrapper">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Price</th>
              <th>Change</th>
              <th>AI Rating</th>
              <th>Alert</th>
            </tr>
          </thead>
          <tbody>
            {errorMessage ? (
              <tr>
                <td colSpan="6" className="negative">{errorMessage}</td>
              </tr>
            ) : null}
            {!errorMessage && isLoading ? (
              <tr>
                <td colSpan="6" className="company-description subtle">Loading watchlist intelligence...</td>
              </tr>
            ) : null}
            {stocks.map((stock) => (
              <tr key={stock.symbol}>
                <td>{stock.symbol}</td>
                <td>{stock.name}</td>
                <td>{stock.price}</td>
                <td className={stock.change.startsWith("+") ? "positive" : "negative"}>{stock.change}</td>
                <td>{stock.aiRating}</td>
                <td>{stock.alert}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
