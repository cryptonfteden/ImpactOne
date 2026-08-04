-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "betaUserId" TEXT;

-- AlterTable
ALTER TABLE "investor_profiles" ADD COLUMN     "betaUserId" TEXT;

-- AlterTable
ALTER TABLE "portfolios" ADD COLUMN     "betaUserId" TEXT;

-- AlterTable
ALTER TABLE "recommendation_feedback" ADD COLUMN     "betaUserId" TEXT;

-- AlterTable
ALTER TABLE "recommendations" ADD COLUMN     "betaUserId" TEXT;

-- CreateTable
CREATE TABLE "beta_users" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beta_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "beta_users_inviteCode_key" ON "beta_users"("inviteCode");

-- CreateIndex
CREATE INDEX "analytics_events_betaUserId_idx" ON "analytics_events"("betaUserId");

-- CreateIndex
CREATE INDEX "investor_profiles_betaUserId_idx" ON "investor_profiles"("betaUserId");

-- CreateIndex
CREATE INDEX "portfolios_betaUserId_idx" ON "portfolios"("betaUserId");

-- CreateIndex
CREATE INDEX "recommendation_feedback_betaUserId_idx" ON "recommendation_feedback"("betaUserId");

-- CreateIndex
CREATE INDEX "recommendations_betaUserId_idx" ON "recommendations"("betaUserId");
