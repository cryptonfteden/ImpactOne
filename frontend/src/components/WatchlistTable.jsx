import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function WatchlistTable() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const response = await fetch(`${API_BASE}/watchlist`);
        const data = await response.json();
        const mapped = (data.watchlist || []).map((item) => ({
          symbol: item.symbol,
          name: item.symbol,
          price: `$${Number(item.price || 0).toFixed(2)}`,
          change: `${item.change >= 0 ? "+" : ""}${Number(item.change || 0).toFixed(2)}%`,
          volume: "--",
        }));
        setStocks(mapped);
      } catch (error) {
        console.error(error);
      }
    }

    loadWatchlist();
  }, []);

  return (
    <section className="panel-card panel-card--wide">
      <div className="panel-card__header">
        <div>
          <p className="panel-card__eyebrow">Portfolio Pulse</p>
          <h3>Watchlist</h3>
        </div>
        <button className="ghost-button" type="button">
          View All
        </button>
      </div>

      <div className="table-wrapper">
        <table className="watchlist-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Company</th>
              <th>Price</th>
              <th>Change</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.symbol}>
                <td>{stock.symbol}</td>
                <td>{stock.name}</td>
                <td>{stock.price}</td>
                <td className={stock.change.startsWith("+") ? "positive" : "negative"}>{stock.change}</td>
                <td>{stock.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
