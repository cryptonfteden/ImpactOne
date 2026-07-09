export default function Header() {
  return (
    <header className="header-bar">
      <div className="header-title-group">
        <h2>Overview</h2>
        <p>Monday, July 9 • Market open</p>
      </div>

      <div className="header-controls">
        <label className="search-box" htmlFor="company-search">
          <span aria-hidden="true">🔎</span>
          <input id="company-search" type="text" placeholder="Search company..." />
        </label>
        <div className="market-pill">Market: Open 🟢</div>
      </div>
    </header>
  );
}