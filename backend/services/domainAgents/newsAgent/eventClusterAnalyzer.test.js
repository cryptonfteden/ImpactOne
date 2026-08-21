const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEventClusters } = require("./eventClusterAnalyzer");

test("groups independent reports about the same event", () => {
  const clusters = buildEventClusters([
    { title: "Apple acquires quantum startup Qubit Labs", description: "Apple announced the Qubit Labs acquisition", source: "Reuters", url: "https://a" },
    { title: "Apple completes acquisition of quantum firm Qubit Labs", description: "The Qubit Labs deal expands Apple quantum research", source: "Bloomberg", url: "https://b" },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].sourceCount, 2);
});

test("does not call unrelated company stories independent confirmation", () => {
  const clusters = buildEventClusters([
    { title: "Apple acquires quantum startup", description: "A new research acquisition", source: "Reuters", url: "https://a" },
    { title: "Apple iPhone sales rise in Europe", description: "Quarterly handset demand improved", source: "Bloomberg", url: "https://b" },
  ]);
  assert.equal(clusters.length, 2);
  assert.equal(clusters[0].sourceCount, 1);
});
