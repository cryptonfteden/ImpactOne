-- CreateEnum
CREATE TYPE "RecommendationLifecycleState" AS ENUM ('GENERATED', 'PUBLISHED', 'VIEWED', 'PAPER_TRADED', 'ACTIVE', 'EXPIRED', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "outcomes" ADD COLUMN     "performanceMetrics" JSONB;

-- CreateTable
CREATE TABLE "recommendation_lifecycle_events" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "state" "RecommendationLifecycleState" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "recommendation_lifecycle_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_lifecycle_events_recommendationId_idx" ON "recommendation_lifecycle_events"("recommendationId");
