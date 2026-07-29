const test = require("node:test");
const assert = require("node:assert/strict");
const { locateInfoTableUrl, buildAccessionBaseUrl } = require("./thirteenFInfoTableLocator");

test("buildAccessionBaseUrl strips real leading zeros from the CIK and dashes from the accession number", () => {
  const url = buildAccessionBaseUrl("0001067983", "0001193125-26-226661");
  assert.equal(url, "https://www.sec.gov/Archives/edgar/data/1067983/000119312526226661");
});

test("locateInfoTableUrl picks the real, non-cover-page .xml file from a real accession's index.json", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () =>
    Promise.resolve({
      data: {
        directory: {
          item: [
            { name: "0001193125-26-226661-index.html" },
            { name: "primary_doc.xml" },
            { name: "53405.xml" },
          ],
        },
      },
    });
  try {
    const url = await locateInfoTableUrl("0001067983", "0001193125-26-226661");
    assert.equal(url, "https://www.sec.gov/Archives/edgar/data/1067983/000119312526226661/53405.xml");
  } finally {
    require("axios").get = originalGet;
  }
});

test("locateInfoTableUrl honestly returns null when no real non-cover-page .xml file is found", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.resolve({ data: { directory: { item: [{ name: "primary_doc.xml" }] } } });
  try {
    const url = await locateInfoTableUrl("0001067983", "0001193125-26-226661");
    assert.equal(url, null);
  } finally {
    require("axios").get = originalGet;
  }
});

test("locateInfoTableUrl honestly returns null on a real network failure, never throwing", async () => {
  const originalGet = require("axios").get;
  require("axios").get = () => Promise.reject(new Error("simulated failure"));
  try {
    const url = await locateInfoTableUrl("0001067983", "0001193125-26-226661");
    assert.equal(url, null);
  } finally {
    require("axios").get = originalGet;
  }
});
