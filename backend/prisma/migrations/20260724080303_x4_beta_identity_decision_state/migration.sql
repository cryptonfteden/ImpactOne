-- CreateEnum
CREATE TYPE "DecisionStatus" AS ENUM ('PINNED', 'DISMISSED', 'COMPLETED');

-- AlterTable
ALTER TABLE "beta_users" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "decision_states" (
    "id" TEXT NOT NULL,
    "betaUserId" TEXT NOT NULL,
    "decisionKey" TEXT NOT NULL,
    "status" "DecisionStatus" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "decision_states_betaUserId_idx" ON "decision_states"("betaUserId");

-- CreateIndex
CREATE UNIQUE INDEX "decision_states_betaUserId_decisionKey_key" ON "decision_states"("betaUserId", "decisionKey");
