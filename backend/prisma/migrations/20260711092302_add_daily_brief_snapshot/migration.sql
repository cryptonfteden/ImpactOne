-- CreateTable
CREATE TABLE "daily_brief_snapshots" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "topEvent" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_brief_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_brief_snapshots_date_key" ON "daily_brief_snapshots"("date");
