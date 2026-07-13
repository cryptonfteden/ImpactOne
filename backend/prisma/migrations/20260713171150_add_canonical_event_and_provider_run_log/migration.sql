-- CreateEnum
CREATE TYPE "ProviderRunStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "canonical_events" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entities" JSONB NOT NULL,
    "symbols" JSONB NOT NULL,
    "sectors" JSONB NOT NULL,
    "countries" JSONB NOT NULL,
    "companies" JSONB NOT NULL,
    "themes" JSONB NOT NULL,
    "language" TEXT NOT NULL,
    "region" TEXT,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "rawReference" JSONB,
    "credibilityScore" DECIMAL(5,2),
    "freshnessScore" DECIMAL(5,2),
    "relevanceScore" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "provenance" JSONB,
    "deduplicationKey" TEXT NOT NULL,

    CONSTRAINT "canonical_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_run_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "ProviderRunStatus" NOT NULL,
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsPersisted" INTEGER NOT NULL DEFAULT 0,
    "itemsDeduped" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "provider_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "canonical_events_deduplicationKey_key" ON "canonical_events"("deduplicationKey");

-- CreateIndex
CREATE INDEX "canonical_events_providerId_idx" ON "canonical_events"("providerId");

-- CreateIndex
CREATE INDEX "provider_run_logs_providerId_idx" ON "provider_run_logs"("providerId");
