-- AlterTable
ALTER TABLE "decision_traces" ADD COLUMN     "committeeDebate" JSONB,
ADD COLUMN     "evidenceReferences" JSONB,
ADD COLUMN     "modelVersionMetadata" JSONB;
