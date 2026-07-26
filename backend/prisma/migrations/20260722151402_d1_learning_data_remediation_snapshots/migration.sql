-- AlterTable
ALTER TABLE "decision_traces" ADD COLUMN     "evidenceMatrixSnapshot" JSONB,
ADD COLUMN     "regimeSnapshot" JSONB;

-- AlterTable
ALTER TABLE "outcomes" ADD COLUMN     "benchmarkVersion" TEXT;
