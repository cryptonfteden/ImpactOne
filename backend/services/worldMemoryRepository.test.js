require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const worldMemoryRepository = require("./worldMemoryRepository");

test.beforeEach(async () => {
  await truncateAll();
});

async function createSampleRecord(overrides = {}) {
  return worldMemoryRepository.createRecord({
    occurredAt: new Date(),
    primaryThemeKey: "ai",
    symbols: ["NVDA"],
    sectors: ["Technology"],
    headline: "NVDA announces new AI chip partnership",
    ...overrides,
  });
}

test("createRecord persists a WorldMemoryRecord with the given fields", async () => {
  const record = await createSampleRecord();
  assert.equal(record.headline, "NVDA announces new AI chip partnership");
  assert.equal(record.primaryThemeKey, "ai");
  assert.deepEqual(record.symbols, ["NVDA"]);
});

test("appendCausalLink links an effect to a cause with an explanation", async () => {
  const cause = await createSampleRecord({ headline: "Fed signals rate pause" });
  const effect = await createSampleRecord({ headline: "Tech rally on rate expectations" });

  const link = await worldMemoryRepository.appendCausalLink({
    effectRecordId: effect.id,
    causeRecordId: cause.id,
    explanation: "Lower expected rates raise growth-stock valuations",
    confidence: 65,
    methodologyVersion: "1.0.0",
  });

  assert.equal(link.effectRecordId, effect.id);
  assert.equal(link.causeRecordId, cause.id);
});

test("appendCausalLink allows a null causeRecordId for an exogenous/unrecorded cause", async () => {
  const effect = await createSampleRecord();
  const link = await worldMemoryRepository.appendCausalLink({
    effectRecordId: effect.id,
    explanation: "Unrecorded exogenous shock",
    confidence: 40,
    methodologyVersion: "1.0.0",
  });
  assert.equal(link.causeRecordId, null);
});

test("appendStateChange stores a before/after Json ledger row", async () => {
  const record = await createSampleRecord();
  const change = await worldMemoryRepository.appendStateChange({
    worldMemoryRecordId: record.id,
    dimension: "theme_confidence",
    beforeValue: { confidenceScore: 60 },
    afterValue: { confidenceScore: 72 },
    methodologyVersion: "1.0.0",
  });
  assert.equal(change.dimension, "theme_confidence");
  assert.deepEqual(change.afterValue, { confidenceScore: 72 });
});

test("createPrediction snapshots the predicted action and confidence", async () => {
  const record = await createSampleRecord();
  const prediction = await worldMemoryRepository.createPrediction({
    worldMemoryRecordId: record.id,
    recommendationId: "rec-123",
    predictedAction: "BUY",
    predictedConfidence: 78,
  });
  assert.equal(prediction.predictedAction, "BUY");
  assert.equal(prediction.predictedConfidence, 78);
});

test("createOutcome and listOutcomesForRecord round-trip", async () => {
  const record = await createSampleRecord();
  const prediction = await worldMemoryRepository.createPrediction({
    worldMemoryRecordId: record.id,
    predictedAction: "BUY",
    predictedConfidence: 78,
  });

  await worldMemoryRepository.createOutcome({
    recommendationId: "rec-123",
    worldMemoryPredictionId: prediction.id,
    symbol: "NVDA",
    action: "BUY",
    timeWindow: "M1",
    windowStartPrice: 120.5,
    gradeLabel: "UNGRADEABLE",
    ungradeableReason: "window not yet closed",
    methodologyVersion: "1.0.0",
    dataSourceSnapshot: {},
  });

  const outcomes = await worldMemoryRepository.listOutcomesForRecord(prediction.id);
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0].gradeLabel, "UNGRADEABLE");
});

test("appendThesisRevision starts at revision 1 with a null previousThesis", async () => {
  const revision = await worldMemoryRepository.appendThesisRevision({
    themeKey: "ai",
    newThesis: "AI capex remains structurally elevated.",
  });
  assert.equal(revision.revisionNumber, 1);
  assert.equal(revision.previousThesis, null);
});

test("appendThesisRevision increments and carries the prior text forward as previousThesis", async () => {
  await worldMemoryRepository.appendThesisRevision({ themeKey: "ai", newThesis: "First thesis." });
  const second = await worldMemoryRepository.appendThesisRevision({ themeKey: "ai", newThesis: "Second thesis." });

  assert.equal(second.revisionNumber, 2);
  assert.equal(second.previousThesis, "First thesis.");
});

test("appendSectorImpact records a direction and magnitude for a sector", async () => {
  const record = await createSampleRecord();
  const impact = await worldMemoryRepository.appendSectorImpact({
    worldMemoryRecordId: record.id,
    sector: "Semiconductors",
    direction: "BENEFITED",
    magnitude: "MAJOR",
    rationale: "Direct beneficiary of the announced partnership.",
  });
  assert.equal(impact.direction, "BENEFITED");
  assert.equal(impact.magnitude, "MAJOR");
});

test("appendLesson persists a lessonText row", async () => {
  const record = await createSampleRecord();
  const lesson = await worldMemoryRepository.appendLesson({
    worldMemoryRecordId: record.id,
    lessonText: "Partnership announcements without shipped volume rarely move margins short-term.",
    methodologyVersion: "1.0.0",
  });
  assert.ok(lesson.id);
  assert.equal(lesson.supersedesId, null);
});

test("appendLesson rejects a supersedesId that does not reference an existing lesson", async () => {
  await assert.rejects(
    () =>
      worldMemoryRepository.appendLesson({
        lessonText: "Some lesson",
        supersedesId: "does-not-exist",
        methodologyVersion: "1.0.0",
      }),
    /does not reference an existing lesson/
  );
});

test("getRecordWithHistory aggregates the spine and all linked satellites", async () => {
  const record = await createSampleRecord();
  await worldMemoryRepository.appendStateChange({
    worldMemoryRecordId: record.id,
    dimension: "sector_sentiment",
    beforeValue: {},
    afterValue: {},
    methodologyVersion: "1.0.0",
  });
  await worldMemoryRepository.appendSectorImpact({
    worldMemoryRecordId: record.id,
    sector: "Semiconductors",
    direction: "BENEFITED",
    magnitude: "MODERATE",
    rationale: "Direct exposure.",
  });
  await worldMemoryRepository.appendLesson({
    worldMemoryRecordId: record.id,
    lessonText: "Lesson text.",
    methodologyVersion: "1.0.0",
  });

  const result = await worldMemoryRepository.getRecordWithHistory(record.id);
  assert.equal(result.record.id, record.id);
  assert.equal(result.stateChanges.length, 1);
  assert.equal(result.sectorImpacts.length, 1);
  assert.equal(result.lessons.length, 1);
});

test("getRecordWithHistory returns null for an unknown record id", async () => {
  const result = await worldMemoryRepository.getRecordWithHistory("does-not-exist");
  assert.equal(result, null);
});
