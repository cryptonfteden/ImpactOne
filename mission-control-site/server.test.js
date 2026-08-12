const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;

test("Mission Control site has its independent server and browser assets", () => {
  for (const file of ["server.js", "public/index.html", "public/styles.css", "public/app.js"]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} should exist`);
  }
});

test("Mission Control site is self-contained and reads through its API bridge", () => {
  const server = fs.readFileSync(path.join(root, "server.js"), "utf8");
  const page = fs.readFileSync(path.join(root, "public/index.html"), "utf8");
  assert.match(server, /app\.get\("\/api\/dashboard"/);
  assert.match(server, /127\.0\.0\.1:5000/);
  assert.match(server, /app\.post\("\/api\/assistant"/);
  assert.doesNotMatch(page, /127\.0\.0\.1:5174/);
  assert.match(page, /id="recommendations"/);
});
