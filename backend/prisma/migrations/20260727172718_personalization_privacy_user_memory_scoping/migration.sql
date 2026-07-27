-- AlterTable
ALTER TABLE "user_memory_events" ADD COLUMN     "betaUserId" TEXT;

-- CreateIndex
CREATE INDEX "user_memory_events_betaUserId_idx" ON "user_memory_events"("betaUserId");
