-- AlterTable
ALTER TABLE "analytics_events" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");
