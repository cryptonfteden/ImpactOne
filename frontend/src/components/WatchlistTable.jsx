import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export default function WatchlistTable() {
  const [stocks, setStocks] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadWatchlist() {
      try {
        const response = await fetch(`${API_BASE}/watchlist`);
        const data = await response.json();
        if (!response.ok) {
          setErrorMessage(data.error || "Unable to load watchlist data.");
          setStocks([]);
          return;
        }

        const mapped = (data.watchlist || []).map((item) => ({
          symbol: item.symbol,
          name: item.company || item.symbol,
          price: `$${Number(item.price || 0).toFixed(2)}`,
          change: `${item.change >= 0 ? "+" : ""}${Number(item.change || 0).toFixed(2)}%`,
          aiRating: item.aiRating || "Hold",
          alert: item.alertBadge?.label || "Monitor",
        }));
        setStocks(mapped);
        setErrorMessage("");
      } catch (error) {
        console.error(error);
        setStocks([]);
        setErrorMessage("Unable to load watchlist data.");
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
