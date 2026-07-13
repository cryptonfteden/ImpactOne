require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const { truncateAll } = require("../test/dbHelpers");
const worldMemoryRepository = require("./worldMemoryRepository");

test.beforeEach(async () => {
  await truncateAll();
});

test("worldMemoryRepository.js source never calls Prisma .update() or .delete() on any model", () => {
  const rawSource = fs.readFileSync(path.join(__dirname, "worldMemoryRepository.js"), "utf8");
  // Strip comments first so this can't be fooled (or false-failed) by prose
  // like "never calls .update()" appearing in a doc comment.
  const codeOnly = rawSource.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

  assert.doesNotMatch(codeOnly, /\.update\(/, "the persistence strategy forbids in-place mutation of World Memory history");
  assert.doesNotMatch(codeOnly, /\.delete\(/, "the persistence strategy forbids deleting World Memory history");
  assert.doesNotMatch(codeOnly, /\.upsert\(/, "upsert can silently overwrite an existing row — not permitted here");
});

test("appendThesisRevision never produces a duplicate revisionNumber under concurrent calls for the same themeKey", async () => {
  const CONCURRENT_CALLS = 8;
  const results = await Promise.all(
    Array.from({ length: CONCURRENT_CALLS }, (_, i) =>
      worldMemoryRepository.appendThesisRevision({ themeKey: "ai", newThesis: `Thesis version ${i}` })
    )
  );

  const revisionNumbers = results.map((r) => r.revisionNumber).sort((a, b) => a - b);
  const uniqueNumbers = new Set(revisionNumbers);

  assert.equal(uniqueNumbers.size, CONCURRENT_CALLS, "every concurrent call must get a distinct revision number");
  assert.deepEqual(revisionNumbers, Array.from({ length: CONCURRENT_CALLS }, (_, i) => i + 1), "revision numbers must be exactly 1..N with no gaps or duplicates");
});

test("appendThesisRevision keeps revision numbering independent per themeKey", async () => {
  await worldMemoryRepository.appendThesisRevision({ themeKey: "ai", newThesis: "AI thesis v1" });
  const defenseFirst = await worldMemoryRepository.appendThesisRevision({ themeKey: "defense", newThesis: "Defense thesis v1" });
  assert.equal(defenseFirst.revisionNumber, 1, "a different themeKey starts its own revision sequence at 1");
});

test("appendLesson with supersedesId leaves the original lesson's text and id untouched", async () => {
  const original = await worldMemoryRepository.appendLesson({
    lessonText: "Original understanding: X caused Y.",
    methodologyVersion: "1.0.0",
  });

  const revised = await worldMemoryRepository.appendLesson({
    lessonText: "Revised understanding: X did not cause Y; Z did.",
    supersedesId: original.id,
    methodologyVersion: "1.1.0",
  });

  assert.notEqual(revised.id, original.id);
  assert.equal(revised.supersedesId, original.id);

  const { getPrismaClient } = require("../db/prismaClient");
  const prisma = getPrismaClient();
  const originalReread = await prisma.worldMemoryLesson.findUnique({ where: { id: original.id } });
  assert.equal(originalReread.lessonText, "Original understanding: X caused Y.", "the original lesson must remain exactly as written");
  assert.equal(originalReread.supersedesId, null, "the original lesson is never retroactively linked to its successor");
});

test("createRecord, once created, has no exposed way to be mutated through this repository", () => {
  const exportedFunctionNames = Object.keys(worldMemoryRepository);
  const mutators = exportedFunctionNames.filter((name) => /^(update|edit|delete|remove)/i.test(name));
  assert.deepEqual(mutators, [], "no exported function name suggests mutation of existing history");
});
