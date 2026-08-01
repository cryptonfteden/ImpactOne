import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/apiConfig";

const API_BASE = API_BASE_URL;

export default function AIInsightsSidebar() {
  const [insights, setInsights] = useState([]);

  useEffect(() => {
    async function loadInsights() {
      try {
        const response = await fetch(`${API_BASE}/news?query=finance`);
        const data = await response.json();
        const mapped = (data.news || []).slice(0, 3).map((item) => ({
          title: item.title || "Market signal",
          detail: item.description || "Live market update available.",
        }));
        setInsights(mapped);
      } catch (error) {
        console.error(error);
      }
    }

    loadInsights();
  }, []);

  return (
    <aside className="panel-card insights-panel">
      <div className="panel-card__header">
        <div>
          <p className="panel-card__eyebrow">AI Companion</p>
          <h3>Insights</h3>
        </div>
      </div>

      <div className="insights-list">
        {insights.map((item) => (
          <div key={item.title} className="insight-item">
            <h4>{item.title}</h4>
            <p>{item.detail}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}
