-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('BUG', 'SUGGESTION', 'QUESTION', 'PRAISE');

-- CreateEnum
CREATE TYPE "FeatureFlagMode" AS ENUM ('ENABLED', 'DISABLED', 'BETA_ONLY', 'USER_SPECIFIC');

-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "durationMs" INTEGER,
ADD COLUMN     "screen" TEXT;

-- CreateTable
CREATE TABLE "feedback" (
    "id" TEXT NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "message" TEXT NOT NULL,
    "screen" TEXT,
    "browser" TEXT,
    "appVersion" TEXT,
    "betaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_reports" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "screen" TEXT,
    "action" TEXT,
    "apiInvolved" TEXT,
    "correlationId" TEXT,
    "betaUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "mode" "FeatureFlagMode" NOT NULL DEFAULT 'DISABLED',
    "enabledForUsers" TEXT[],
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- CreateIndex
CREATE INDEX "feedback_betaUserId_idx" ON "feedback"("betaUserId");

-- CreateIndex
CREATE INDEX "error_reports_source_idx" ON "error_reports"("source");

-- CreateIndex
CREATE INDEX "error_reports_createdAt_idx" ON "error_reports"("createdAt");

-- CreateIndex
CREATE INDEX "error_reports_correlationId_idx" ON "error_reports"("correlationId");

-- CreateIndex
CREATE INDEX "error_reports_betaUserId_idx" ON "error_reports"("betaUserId");

-- CreateIndex
CREATE INDEX "analytics_events_screen_idx" ON "analytics_events"("screen");
