-- CreateEnum
CREATE TYPE "IntelligenceBusLifecycleStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "intelligence_bus_events" (
    "id" TEXT NOT NULL,
    "engineId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "symbols" TEXT[],
    "confidence" DECIMAL(5,2),
    "rawConfidence" DECIMAL(5,2),
    "provenance" JSONB NOT NULL,
    "evidenceRefs" JSONB NOT NULL,
    "payload" JSONB NOT NULL,
    "identityKey" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lifecycleStatus" "IntelligenceBusLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "supersededByEventId" TEXT,
    "methodologyVersion" TEXT NOT NULL,
    "canonicalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intelligence_bus_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "intelligence_bus_events_deduplicationKey_key" ON "intelligence_bus_events"("deduplicationKey");

-- CreateIndex
CREATE INDEX "intelligence_bus_events_engineId_publishedAt_idx" ON "intelligence_bus_events"("engineId", "publishedAt");

-- CreateIndex
CREATE INDEX "intelligence_bus_events_identityKey_idx" ON "intelligence_bus_events"("identityKey");

-- CreateIndex
CREATE INDEX "intelligence_bus_events_lifecycleStatus_idx" ON "intelligence_bus_events"("lifecycleStatus");
