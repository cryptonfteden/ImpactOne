require("../test/testEnv");

const test = require("node:test");
const assert = require("node:assert/strict");

const { truncateAll } = require("../test/dbHelpers");
const { getPrismaClient } = require("../db/prismaClient");
const autonomousMarketService = require("./autonomousMarketService");
const themeIntelligenceService = require("./themeIntelligenceService");
const worldMemoryRepository = require("./worldMemoryRepository");

async function seedSnapshot({ themeKey, date, confidenceScore, maturityLabel }) {
  const prisma = getPrismaClient();
  return prisma.themeConfidenceSnapshot.create({ data: { themeKey, date, confidenceScore, maturityLabel } });
}

const REQUIRED_THEMES = ["ai", "quantum", "defense", "energy", "space", "cybersecurity", "healthcare"];

function withMockedFeed(feed, run) {
  const original = autonomousMarketService.getAutonomousOverview;
  autonomousMarketService.getAutonomousOverview = async () => ({ feed });
  return Promise.resolve(run()).finally(() => {
    autonomousMarketService.getAutonomousOverview = original;
  });
}

test.beforeEach(async () => {
  await truncateAll();
});

test("all 7 required themes are defined with a label, companies, and an etfs array", () => {
  for (const themeKey of REQUIRED_THEMES) {
    const definition = themeIntelligenceService.THEME_DEFINITIONS[themeKey];
    assert.ok(definition, `missing theme definition for ${themeKey}`);
    assert.ok(definition.label.length > 0);
    assert.ok(Array.isArray(definition.companies) && definition.companies.length > 0);
    assert.ok(Array.isArray(definition.etfs));
  }
});

test("getThemeIntelligence throws a 404-style error for an unknown theme", async () => {
  await assert.rejects(() => themeIntelligenceService.getThemeIntelligence("not-a-real-theme"), (error) => error.statusCode === 404);
});

test("maturity is derived from real matching-event volume, not fabricated", async () => {
  await withMockedFeed(
    [
      { headline: "AI capex surge", whyItMatters: "x", eventType: "ai", confidence: 80 },
      { headline: "AI compute deal", whyItMatters: "x", eventType: "ai", confidence: 70 },
      { headline: "AI chip shortage", whyItMatters: "x", eventType: "ai", confidence: 60 },
      { headline: "Unrelated defense news", whyItMatters: "x", eventType: "defense", confidence: 50 },
    ],
    async () => {
      const result = await themeIntelligenceService.getThemeIntelligence("ai");
      assert.equal(result.maturity, "Growth");
      assert.equal(result.supportingEvidence.length, 3);
      assert.ok(result.supportingEvidence.every((item) => item.headline.includes("AI")));
    }
  );
});

test("a theme with no matching events today is honestly 'Early' maturity with an honest empty-state thesis", async () => {
  await withMockedFeed([{ headline: "Unrelated", whyItMatters: "x", eventType: "energy", confidence: 50 }], async () => {
    const result = await themeIntelligenceService.getThemeIntelligence("quantum");
    assert.equal(result.maturity, "Early");
    assert.match(result.thesis, /No major Quantum developments/);
    assert.equal(result.supportingEvidence.length, 0);
  });
});

test("confidenceScore is the average confidence of matching events, defaulting to 50 with none", async () => {
  await withMockedFeed(
    [
      { headline: "A", whyItMatters: "x", eventType: "defense", confidence: 80 },
      { headline: "B", whyItMatters: "x", eventType: "defense", confidence: 60 },
    ],
    async () => {
      const result = await themeIntelligenceService.getThemeIntelligence("defense");
      assert.equal(result.confidenceScore, 70);
    }
  );
});

test("captureTodaySnapshotForAllThemes persists one snapshot per theme and confidenceTrend reflects it on the next call", async () => {
  await withMockedFeed([{ headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 }], async () => {
    const results = await themeIntelligenceService.captureTodaySnapshotForAllThemes();
    assert.equal(results.length, REQUIRED_THEMES.length);
    assert.ok(results.every((item) => item.ok));

    const result = await themeIntelligenceService.getThemeIntelligence("ai");
    assert.equal(result.confidenceTrend.length, 1);
    assert.equal(result.confidenceTrend[0].confidenceScore, 65);
  });
});

test("captureTodaySnapshotForAllThemes appends a WorldMemoryThesisRevision the first time a theme's thesis is captured", async () => {
  await withMockedFeed([{ headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 }], async () => {
    await themeIntelligenceService.captureTodaySnapshotForAllThemes();
    const revision = await worldMemoryRepository.getLatestThesisRevision("ai");
    assert.ok(revision, "expected a thesis revision to be written on first capture");
    assert.equal(revision.revisionNumber, 1);
    assert.equal(revision.previousThesis, null);
    assert.match(revision.newThesis, /AI news/);
  });
});

test("captureTodaySnapshotForAllThemes does not append a new revision when the thesis text is unchanged", async () => {
  await withMockedFeed([{ headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 }], async () => {
    await themeIntelligenceService.captureTodaySnapshotForAllThemes();
    await themeIntelligenceService.captureTodaySnapshotForAllThemes();
    const revision = await worldMemoryRepository.getLatestThesisRevision("ai");
    assert.equal(revision.revisionNumber, 1, "identical thesis text on a second run must not create a second revision");
  });
});

test("captureTodaySnapshotForAllThemes appends a new revision when the thesis text genuinely changes", async () => {
  await withMockedFeed([{ headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 }], async () => {
    await themeIntelligenceService.captureTodaySnapshotForAllThemes();
  });
  await withMockedFeed(
    [
      { headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 },
      { headline: "AI second signal", whyItMatters: "y", eventType: "ai", confidence: 70 },
    ],
    async () => {
      await themeIntelligenceService.captureTodaySnapshotForAllThemes();
    }
  );

  const revision = await worldMemoryRepository.getLatestThesisRevision("ai");
  assert.equal(revision.revisionNumber, 2, "a genuinely different thesis text must append revision 2");
  assert.match(revision.previousThesis, /AI news/);
});

test("Sprint 29 — computeThemeEvolution is honest about no comparison yet with zero persisted snapshots", async () => {
  await withMockedFeed([{ headline: "AI news", whyItMatters: "x", eventType: "ai", confidence: 65 }], async () => {
    const evolution = await themeIntelligenceService.computeThemeEvolution("ai");
    assert.equal(evolution.hasComparison, false);
    assert.equal(evolution.confidenceDelta, null);
    assert.equal(evolution.strengthened, false);
    assert.equal(evolution.weakened, false);
  });
});

test("Sprint 29 — computeThemeEvolution compares live confidence against the most recently persisted snapshot, never a contradictory delta", async () => {
  await withMockedFeed(
    [
      { headline: "AI capex surge", whyItMatters: "x", eventType: "ai", confidence: 90 },
      { headline: "AI compute deal", whyItMatters: "x", eventType: "ai", confidence: 85 },
      { headline: "AI chip shortage", whyItMatters: "x", eventType: "ai", confidence: 80 },
    ],
    async () => {
      await seedSnapshot({ themeKey: "ai", date: "2026-07-14", confidenceScore: 50, maturityLabel: "Emerging" });

      const evolution = await themeIntelligenceService.computeThemeEvolution("ai");
      assert.equal(evolution.hasComparison, true);
      assert.equal(evolution.strengthened, true);
      assert.equal(evolution.weakened, false);
      // (90+85+80)/3 = 85 live vs the 50 snapshot — the delta must match
      // exactly the same two numbers shown as previous/current.
      assert.equal(evolution.currentConfidence, 85);
      assert.equal(evolution.previousConfidence, 50);
      assert.equal(evolution.confidenceDelta, 35);
      assert.ok(evolution.whatsNew.length > 0, "whatsNew should surface real current evidence headlines");
      assert.match(evolution.why, /AI capex surge/);
    }
  );
});

test("Sprint 29 — computeThemeEvolution reports weakened when live confidence fell vs the last snapshot, and disappeared when maturity regressed to Early", async () => {
  await withMockedFeed([], async () => {
    await seedSnapshot({ themeKey: "quantum", date: "2026-07-14", confidenceScore: 70, maturityLabel: "Growth" });

    const evolution = await themeIntelligenceService.computeThemeEvolution("quantum");
    assert.equal(evolution.currentConfidence, 50, "no matching events today should honestly default to the neutral 50 confidence");
    assert.equal(evolution.previousConfidence, 70);
    assert.equal(evolution.weakened, true);
    assert.equal(evolution.strengthened, false);
    assert.equal(evolution.disappeared, true, "a theme that regressed from Growth to Early with no current evidence should be flagged as disappeared");
  });
});
