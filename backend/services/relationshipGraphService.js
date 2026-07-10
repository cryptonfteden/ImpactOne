const graph = {
  NVDA: ["AI", "Semiconductors", "Cloud"],
  AI: ["Semiconductors", "Cloud", "Power demand"],
  Semiconductors: ["TSMC", "ASML", "Memory"],
  TSMC: ["ASML", "Memory"],
  ASML: ["Memory", "Cloud"],
  Memory: ["Cloud", "Data centers"],
  Cloud: ["Power demand", "Utilities"],
  "Power demand": ["Utilities", "Natural Gas"],
  Utilities: ["Bonds", "Rates"],
  Oil: ["Energy", "Airlines", "Shipping", "Inflation"],
  Energy: ["Inflation", "Rates", "Consumer"],
  BTC: ["Crypto", "Risk assets", "Liquidity"],
  Crypto: ["Risk assets", "Rates"],
  "Fed rate hike": ["Rates", "Bonds", "USD", "Growth stocks"],
};

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeEvent(event = "") {
  return String(event || "").trim();
}

function getRelatedNodes(node) {
  const normalized = normalizeEvent(node);
  return graph[normalized] || [];
}

function buildImpactGraph(event = "") {
  const root = normalizeEvent(event);
  const firstLayer = getRelatedNodes(root);
  const secondLayer = unique(firstLayer.flatMap((item) => getRelatedNodes(item))).filter((item) => item !== root);
  const thirdLayer = unique(secondLayer.flatMap((item) => getRelatedNodes(item))).filter((item) => item !== root);

  const nodes = unique([root, ...firstLayer, ...secondLayer, ...thirdLayer]).map((id) => ({ id }));
  const edges = [];

  function connect(from, toList) {
    toList.forEach((to) => {
      edges.push({ from, to });
    });
  }

  connect(root, firstLayer);
  firstLayer.forEach((item) => connect(item, getRelatedNodes(item)));
  secondLayer.forEach((item) => connect(item, getRelatedNodes(item)));

  return {
    root,
    nodes,
    edges,
  };
}

module.exports = { getRelatedNodes, buildImpactGraph };
