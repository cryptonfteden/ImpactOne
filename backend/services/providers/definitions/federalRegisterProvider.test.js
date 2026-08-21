require("../../../test/testEnv");
const test = require("node:test");
const assert = require("node:assert/strict");
const provider = require("./federalRegisterProvider");

test("Federal Register documents remain official evidence without invented stock symbols", () => {
  const event = provider.normalizeFederalRegisterDocument({
    title: "Funding opportunity for advanced nuclear energy infrastructure",
    abstract: "A new federal funding program.",
    html_url: "https://www.federalregister.gov/documents/example",
    publication_date: "2026-08-20",
    document_number: "2026-00001",
    type: "Notice",
    agencies: [{ name: "Department of Energy" }],
  });
  assert.equal(event.sourceName, "Federal Register");
  assert.deepEqual(event.symbols, []);
  assert.ok(event.sectors.includes("Energy"));
  assert.equal(event.credibilityScore, 100);
});
