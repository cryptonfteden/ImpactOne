-- CreateTable
CREATE TABLE "theme_confidence_snapshots" (
    "id" TEXT NOT NULL,
    "themeKey" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2) NOT NULL,
    "maturityLabel" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_confidence_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "theme_confidence_snapshots_themeKey_date_key" ON "theme_confidence_snapshots"("themeKey", "date");
