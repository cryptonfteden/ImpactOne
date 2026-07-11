/*
  Warnings:

  - Added the required column `explanation` to the `recommendations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qualityComponents` to the `recommendations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qualityScore` to the `recommendations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scenarios` to the `recommendations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "explanation" JSONB NOT NULL,
ADD COLUMN     "qualityComponents" JSONB NOT NULL,
ADD COLUMN     "qualityScore" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "scenarios" JSONB NOT NULL,
ADD COLUMN     "timeHorizon" TEXT;

-- CreateTable
CREATE TABLE "decision_traces" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "inputEvidence" JSONB NOT NULL,
    "rankingResult" JSONB NOT NULL,
    "confidenceCalculation" JSONB NOT NULL,
    "finalOutput" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_traces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "decision_traces_recommendationId_key" ON "decision_traces"("recommendationId");

-- AddForeignKey
ALTER TABLE "decision_traces" ADD CONSTRAINT "decision_traces_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
