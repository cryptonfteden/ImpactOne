-- CreateEnum
CREATE TYPE "RecommendationAction" AS ENUM ('BUY', 'REDUCE', 'EXIT');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('ACTIVE', 'SUPERSEDED', 'EXPIRED');

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbol" TEXT NOT NULL,
    "action" "RecommendationAction" NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "expectedUpside" TEXT NOT NULL,
    "expectedDownside" TEXT NOT NULL,
    "riskScore" DECIMAL(5,2) NOT NULL,
    "riskLabel" TEXT NOT NULL,
    "positionSizeSuggestion" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "portfolioContext" JSONB,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "supersededById" TEXT,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autonomous_run_logs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symbolsEvaluated" INTEGER NOT NULL,
    "recommendationsGenerated" INTEGER NOT NULL,
    "errors" JSONB,

    CONSTRAINT "autonomous_run_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendations_symbol_status_idx" ON "recommendations"("symbol", "status");

-- CreateIndex
CREATE INDEX "recommendations_createdAt_idx" ON "recommendations"("createdAt");
