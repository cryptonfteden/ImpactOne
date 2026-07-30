const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFredCsv, findObservationNear } = require("./fredCsvParser");

test("parseFredCsv: parses real header + rows, skipping the header line", () => {
  const csv = "observation_date,FEDFUNDS\n2026-01-01,4.33\n2026-02-01,4.10\n";
  const observations = parseFredCsv(csv);
  assert.deepEqual(observations, [
    { date: "2026-01-01", value: 4.33 },
    { date: "2026-02-01", value: 4.1 },
  ]);
});

test("parseFredCsv: a real FRED '.' not-yet-published marker becomes null, never 0", () => {
  const csv = "observation_date,GDPC1\n2026-01-01,24180.419\n2026-04-01,.\n";
  const observations = parseFredCsv(csv);
  assert.equal(observations[1].value, null);
});

test("parseFredCsv: skips blank trailing lines", () => {
  const csv = "observation_date,FEDFUNDS\n2026-01-01,4.33\n\n";
  const observations = parseFredCsv(csv);
  assert.equal(observations.length, 1);
});

test("findObservationNear: finds the closest real observation within tolerance", () => {
  const observations = [
    { date: "2025-01-01", value: 100 },
    { date: "2025-06-15", value: 110 },
    { date: "2026-01-01", value: 120 },
  ];
  const found = findObservationNear(observations, "2025-06-01", 45);
  assert.deepEqual(found, { date: "2025-06-15", value: 110 });
});

test("findObservationNear: honestly returns null when nothing real is within tolerance", () => {
  const observations = [{ date: "2020-01-01", value: 100 }];
  const found = findObservationNear(observations, "2026-01-01", 45);
  assert.equal(found, null);
});

test("findObservationNear: ignores null-valued observations", () => {
  const observations = [
    { date: "2025-06-01", value: null },
    { date: "2025-06-10", value: 50 },
  ];
  const found = findObservationNear(observations, "2025-06-01", 45);
  assert.deepEqual(found, { date: "2025-06-10", value: 50 });
});
