-- CreateTable
CREATE TABLE "methodology_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "affectedModels" JSONB NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rolledBackAt" TIMESTAMP(3),
    "rolledBackFrom" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "methodology_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_adjustment_audits" (
    "id" TEXT NOT NULL,
    "adjustmentKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "observedRate" DECIMAL(6,4),
    "confidenceInterval" JSONB,
    "adjustmentValue" DECIMAL(6,2) NOT NULL,
    "applied" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_adjustment_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_score_snapshots" (
    "id" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "trustScore" DECIMAL(6,2),
    "accuracyRate" DECIMAL(6,4),
    "falsePositiveRate" DECIMAL(6,4),
    "falseNegativeRate" DECIMAL(6,4),
    "timelinessMs" INTEGER,
    "engagementCount" INTEGER NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_score_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "methodology_versions_version_key" ON "methodology_versions"("version");

-- CreateIndex
CREATE INDEX "methodology_versions_isActive_idx" ON "methodology_versions"("isActive");

-- CreateIndex
CREATE INDEX "scoring_adjustment_audits_adjustmentKey_idx" ON "scoring_adjustment_audits"("adjustmentKey");

-- CreateIndex
CREATE INDEX "scoring_adjustment_audits_computedAt_idx" ON "scoring_adjustment_audits"("computedAt");

-- CreateIndex
CREATE INDEX "source_score_snapshots_sourceName_idx" ON "source_score_snapshots"("sourceName");

-- CreateIndex
CREATE INDEX "source_score_snapshots_computedAt_idx" ON "source_score_snapshots"("computedAt");
