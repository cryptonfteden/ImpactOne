-- CreateEnum
CREATE TYPE "TimeWindow" AS ENUM ('D1', 'W1', 'M1', 'M3', 'M6', 'Y1');

-- CreateEnum
CREATE TYPE "GradeLabel" AS ENUM ('CORRECT', 'PARTIALLY_CORRECT', 'INCORRECT', 'UNGRADEABLE');

-- CreateEnum
CREATE TYPE "SectorImpactDirection" AS ENUM ('BENEFITED', 'HURT');

-- CreateEnum
CREATE TYPE "SectorImpactMagnitude" AS ENUM ('MINOR', 'MODERATE', 'MAJOR');

-- CreateTable
CREATE TABLE "world_memory_records" (
    "id" TEXT NOT NULL,
    "canonicalEventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "primaryThemeKey" TEXT,
    "symbols" JSONB NOT NULL,
    "sectors" JSONB NOT NULL,
    "headline" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_causal_links" (
    "id" TEXT NOT NULL,
    "effectRecordId" TEXT NOT NULL,
    "causeRecordId" TEXT,
    "explanation" TEXT NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_causal_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_state_changes" (
    "id" TEXT NOT NULL,
    "worldMemoryRecordId" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "beforeValue" JSONB NOT NULL,
    "afterValue" JSONB NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methodologyVersion" TEXT NOT NULL,

    CONSTRAINT "world_memory_state_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_predictions" (
    "id" TEXT NOT NULL,
    "worldMemoryRecordId" TEXT NOT NULL,
    "recommendationId" TEXT,
    "decisionTraceId" TEXT,
    "predictedAction" TEXT NOT NULL,
    "predictedConfidence" INTEGER NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_predictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outcomes" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "decisionTraceId" TEXT,
    "worldMemoryPredictionId" TEXT,
    "symbol" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timeWindow" "TimeWindow" NOT NULL,
    "windowStartPrice" DECIMAL(14,4) NOT NULL,
    "windowEndPrice" DECIMAL(14,4),
    "windowReturnPct" DECIMAL(8,4),
    "benchmarkSymbol" TEXT,
    "benchmarkReturnPct" DECIMAL(8,4),
    "riskAdjustedReturnPct" DECIMAL(8,4),
    "directionCorrect" BOOLEAN,
    "magnitudeWithinExpectedRange" BOOLEAN,
    "realizedAtWindowFraction" DECIMAL(5,4),
    "grade" DECIMAL(5,2),
    "gradeLabel" "GradeLabel" NOT NULL,
    "ungradeableReason" TEXT,
    "methodologyVersion" TEXT NOT NULL,
    "dataSourceSnapshot" JSONB NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_thesis_revisions" (
    "id" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "previousThesis" TEXT,
    "newThesis" TEXT NOT NULL,
    "triggeringRecordId" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_thesis_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_sector_impacts" (
    "id" TEXT NOT NULL,
    "worldMemoryRecordId" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "direction" "SectorImpactDirection" NOT NULL,
    "magnitude" "SectorImpactMagnitude" NOT NULL,
    "rationale" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_sector_impacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "world_memory_lessons" (
    "id" TEXT NOT NULL,
    "worldMemoryRecordId" TEXT,
    "outcomeId" TEXT,
    "lessonText" TEXT NOT NULL,
    "supersedesId" TEXT,
    "methodologyVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "world_memory_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "world_memory_records_occurredAt_idx" ON "world_memory_records"("occurredAt");

-- CreateIndex
CREATE INDEX "world_memory_records_primaryThemeKey_idx" ON "world_memory_records"("primaryThemeKey");

-- CreateIndex
CREATE INDEX "world_memory_causal_links_effectRecordId_idx" ON "world_memory_causal_links"("effectRecordId");

-- CreateIndex
CREATE INDEX "world_memory_causal_links_causeRecordId_idx" ON "world_memory_causal_links"("causeRecordId");

-- CreateIndex
CREATE INDEX "world_memory_state_changes_worldMemoryRecordId_idx" ON "world_memory_state_changes"("worldMemoryRecordId");

-- CreateIndex
CREATE INDEX "world_memory_state_changes_dimension_idx" ON "world_memory_state_changes"("dimension");

-- CreateIndex
CREATE INDEX "world_memory_predictions_worldMemoryRecordId_idx" ON "world_memory_predictions"("worldMemoryRecordId");

-- CreateIndex
CREATE INDEX "world_memory_predictions_recommendationId_idx" ON "world_memory_predictions"("recommendationId");

-- CreateIndex
CREATE INDEX "outcomes_symbol_idx" ON "outcomes"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "outcomes_recommendationId_timeWindow_methodologyVersion_key" ON "outcomes"("recommendationId", "timeWindow", "methodologyVersion");

-- CreateIndex
CREATE UNIQUE INDEX "world_memory_thesis_revisions_themeKey_revisionNumber_key" ON "world_memory_thesis_revisions"("themeKey", "revisionNumber");

-- CreateIndex
CREATE INDEX "world_memory_sector_impacts_worldMemoryRecordId_idx" ON "world_memory_sector_impacts"("worldMemoryRecordId");

-- CreateIndex
CREATE INDEX "world_memory_sector_impacts_sector_idx" ON "world_memory_sector_impacts"("sector");

-- CreateIndex
CREATE INDEX "world_memory_lessons_worldMemoryRecordId_idx" ON "world_memory_lessons"("worldMemoryRecordId");

-- CreateIndex
CREATE INDEX "world_memory_lessons_outcomeId_idx" ON "world_memory_lessons"("outcomeId");
