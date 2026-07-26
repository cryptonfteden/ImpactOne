-- CreateEnum
CREATE TYPE "MarketSentimentDimension" AS ENUM ('NEWS_SENTIMENT', 'AI_RECOMMENDATION_DISTRIBUTION', 'MARKET_BREADTH', 'FEAR_GREED', 'VOLATILITY', 'SECTOR_ROTATION', 'MACRO_EVENTS', 'EARNINGS_TREND', 'OVERALL');

-- CreateEnum
CREATE TYPE "MarketSentimentRegion" AS ENUM ('US', 'EUROPE', 'CHINA', 'JAPAN', 'INDIA', 'CRYPTO', 'COMMODITIES', 'ENERGY');

-- CreateTable
CREATE TABLE "market_sentiment_snapshots" (
    "id" TEXT NOT NULL,
    "market" "MarketSentimentRegion" NOT NULL,
    "dimension" "MarketSentimentDimension" NOT NULL,
    "snapshotDate" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "confidence" DECIMAL(5,2),
    "contributors" JSONB NOT NULL,
    "missingInputs" TEXT[],
    "methodologyVersion" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_sentiment_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_sentiment_snapshots_market_dimension_snapshotDate_idx" ON "market_sentiment_snapshots"("market", "dimension", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "market_sentiment_snapshots_market_dimension_snapshotDate_key" ON "market_sentiment_snapshots"("market", "dimension", "snapshotDate");
