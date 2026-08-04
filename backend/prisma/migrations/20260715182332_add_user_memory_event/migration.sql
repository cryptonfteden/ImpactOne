-- CreateEnum
CREATE TYPE "UserMemoryEventType" AS ENUM ('RECOMMENDATION_VIEWED', 'THEME_VIEWED');

-- CreateTable
CREATE TABLE "user_memory_events" (
    "id" TEXT NOT NULL,
    "eventType" "UserMemoryEventType" NOT NULL,
    "subject" TEXT NOT NULL,
    "sector" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_memory_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_memory_events_eventType_subject_idx" ON "user_memory_events"("eventType", "subject");

-- CreateIndex
CREATE INDEX "user_memory_events_createdAt_idx" ON "user_memory_events"("createdAt");
