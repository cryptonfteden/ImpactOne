-- AlterTable
ALTER TABLE "watchlist_folder_items" ADD COLUMN     "aiFocus" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" BOOLEAN NOT NULL DEFAULT false;
