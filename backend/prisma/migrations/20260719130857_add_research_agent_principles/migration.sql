-- CreateTable
CREATE TABLE "trading_principles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "attributedSource" TEXT NOT NULL,
    "regimeRequirements" JSONB NOT NULL,
    "entryConditions" JSONB NOT NULL,
    "invalidationConditions" JSONB NOT NULL,
    "riskRules" JSONB NOT NULL,
    "knownFailureModes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_principles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "principle_backtest_results" (
    "id" TEXT NOT NULL,
    "principleId" TEXT NOT NULL,
    "regimeTested" TEXT NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "winRate" DECIMAL(5,2),
    "averageReturn" DECIMAL(8,4),
    "notes" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "principle_backtest_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "principle_backtest_results_principleId_idx" ON "principle_backtest_results"("principleId");
