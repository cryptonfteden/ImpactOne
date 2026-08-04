-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('DRAFT', 'ACTIVE', 'STRENGTHENING', 'WEAKENING', 'CONTESTED', 'INVALIDATED', 'EXPIRED', 'RESOLVED_CORRECT', 'RESOLVED_PARTIAL', 'RESOLVED_INCORRECT', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "ClaimDirection" AS ENUM ('BULLISH', 'BEARISH', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ClaimEvidenceStance" AS ENUM ('SUPPORTS', 'CONTRADICTS', 'INVALIDATES');

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "claimType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "market" TEXT,
    "symbols" TEXT[],
    "sectors" TEXT[],
    "regions" TEXT[],
    "statement" TEXT NOT NULL,
    "plainLanguageStatement" TEXT NOT NULL,
    "expectedDirection" "ClaimDirection" NOT NULL,
    "expectedMagnitude" JSONB,
    "timeHorizon" "TimeWindow" NOT NULL,
    "probability" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "uncertainty" DECIMAL(5,2),
    "assumptions" TEXT[],
    "confirmationConditions" TEXT[],
    "invalidationConditions" TEXT[],
    "portfolioImpact" JSONB,
    "sourceAgents" TEXT[],
    "provenance" JSONB NOT NULL,
    "identityKey" TEXT NOT NULL,
    "firstObservedAt" TIMESTAMP(3) NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
    "resolution" JSONB,
    "methodologyVersion" TEXT NOT NULL,
    "supersededByClaimId" TEXT,
    "scenarioId" TEXT,
    "recommendationId" TEXT,
    "worldMemoryPredictionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_evidence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "intelligenceBusEventId" TEXT,
    "sourceEngine" TEXT NOT NULL,
    "sourceProvider" TEXT,
    "stance" "ClaimEvidenceStance" NOT NULL,
    "observedFact" TEXT NOT NULL,
    "inference" TEXT,
    "freshness" JSONB NOT NULL,
    "confidence" DECIMAL(5,2),
    "independenceGroup" TEXT NOT NULL,
    "contributionToClaim" DECIMAL(6,2),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_transitions" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "fromStatus" "ClaimStatus",
    "toStatus" "ClaimStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "triggeringEvidenceId" TEXT,
    "transitionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claim_outcomes" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "gradeLabel" "GradeLabel" NOT NULL,
    "predictedDirection" "ClaimDirection" NOT NULL,
    "actualDirection" "ClaimDirection",
    "directionCorrect" BOOLEAN,
    "magnitudeErrorPct" DECIMAL(8,4),
    "timingErrorDays" INTEGER,
    "calibrationError" DECIMAL(8,4),
    "windowReturnPct" DECIMAL(8,4),
    "benchmarkReturnPct" DECIMAL(8,4),
    "learningFeedback" JSONB NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "gradedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "claim_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "claims_identityKey_key" ON "claims"("identityKey");

-- CreateIndex
CREATE INDEX "claims_status_idx" ON "claims"("status");

-- CreateIndex
CREATE INDEX "claims_subject_idx" ON "claims"("subject");

-- CreateIndex
CREATE INDEX "claim_evidence_claimId_idx" ON "claim_evidence"("claimId");

-- CreateIndex
CREATE INDEX "claim_transitions_claimId_idx" ON "claim_transitions"("claimId");

-- CreateIndex
CREATE INDEX "claim_outcomes_claimId_idx" ON "claim_outcomes"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "claim_outcomes_claimId_methodologyVersion_key" ON "claim_outcomes"("claimId", "methodologyVersion");
