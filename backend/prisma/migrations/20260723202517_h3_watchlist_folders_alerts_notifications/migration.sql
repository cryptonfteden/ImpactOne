-- CreateEnum
CREATE TYPE "PriceAlertDirection" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "PriceAlertStatus" AS ENUM ('ACTIVE', 'TRIGGERED', 'INACTIVE');

-- CreateTable
CREATE TABLE "watchlist_folders" (
    "id" TEXT NOT NULL,
    "betaUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_folder_items" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_folder_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "betaUserId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "PriceAlertDirection" NOT NULL,
    "targetPrice" DECIMAL(18,6) NOT NULL,
    "status" "PriceAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),
    "triggerPrice" DECIMAL(18,6),

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "betaUserId" TEXT NOT NULL,
    "priceAlertId" TEXT,
    "symbol" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetPrice" DECIMAL(18,6),
    "triggerPrice" DECIMAL(18,6),
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_folders_betaUserId_idx" ON "watchlist_folders"("betaUserId");

-- CreateIndex
CREATE INDEX "watchlist_folder_items_folderId_idx" ON "watchlist_folder_items"("folderId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_folder_items_folderId_symbol_key" ON "watchlist_folder_items"("folderId", "symbol");

-- CreateIndex
CREATE INDEX "price_alerts_betaUserId_idx" ON "price_alerts"("betaUserId");

-- CreateIndex
CREATE INDEX "price_alerts_status_idx" ON "price_alerts"("status");

-- CreateIndex
CREATE INDEX "notifications_betaUserId_idx" ON "notifications"("betaUserId");

-- CreateIndex
CREATE INDEX "notifications_betaUserId_isRead_idx" ON "notifications"("betaUserId", "isRead");

-- AddForeignKey
ALTER TABLE "watchlist_folder_items" ADD CONSTRAINT "watchlist_folder_items_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "watchlist_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
