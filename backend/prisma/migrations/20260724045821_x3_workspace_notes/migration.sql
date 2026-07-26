-- CreateTable
CREATE TABLE "workspace_notes" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "betaUserId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isAiNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workspace_notes_folderId_idx" ON "workspace_notes"("folderId");

-- AddForeignKey
ALTER TABLE "workspace_notes" ADD CONSTRAINT "workspace_notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "watchlist_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
