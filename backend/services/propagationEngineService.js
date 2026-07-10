function propagateByTheme(event = "") {
  const text = String(event || "").toLowerCase();

  if (text.includes("oil")) {
    return [
      { from: "Oil", to: "Airlines", effect: "down" },
      { from: "Oil", to: "Shipping", effect: "up" },
      { from: "Oil", to: "Defense", effect: "up" },
      { from: "Oil", to: "Inflation", effect: "up" },
      { from: "Inflation", to: "Rates", effect: "up" },
      { from: "Rates", to: "Consumer", effect: "down" },
    ];
  }

  if (text.includes("fed") || text.includes("rate")) {
    return [
      { from: "Fed funds", to: "Bonds", effect: "down" },
      { from: "Fed funds", to: "USD", effect: "up" },
      { from: "USD", to: "Commodities", effect: "down" },
      { from: "Rates", to: "Growth equities", effect: "down" },
    ];
  }

  if (text.includes("ai") || text.includes("nvidia")) {
    return [
      { from: "AI demand", to: "Semiconductors", effect: "up" },
      { from: "Semiconductors", to: "Cloud", effect: "up" },
      { from: "Cloud", to: "Power demand", effect: "up" },
      { from: "Power demand", to: "Utilities", effect: "up" },
    ];
  }

  return [
    { from: "Macro shock", to: "Risk assets", effect: "mixed" },
    { from: "Risk assets", to: "Sector dispersion", effect: "up" },
  ];
}

module.exports = { propagateByTheme };
