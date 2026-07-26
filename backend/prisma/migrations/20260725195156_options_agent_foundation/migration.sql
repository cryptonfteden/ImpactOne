-- CreateEnum
CREATE TYPE "OptionRight" AS ENUM ('CALL', 'PUT');

-- CreateEnum
CREATE TYPE "AggressorSide" AS ENUM ('BUY', 'SELL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OptionsSignalType" AS ENUM ('VOLUME_SPIKE', 'SWEEP', 'BLOCK_TRADE', 'CALL_PUT_SKEW');

-- CreateEnum
CREATE TYPE "OiConfirmationStatus" AS ENUM ('PENDING', 'CONFIRMED_NEW_POSITION', 'CONFIRMED_CLOSING', 'UNCONFIRMED');

-- CreateTable
CREATE TABLE "options_flow_prints" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "expiry" DATE NOT NULL,
    "strike" DECIMAL(12,4) NOT NULL,
    "optionType" "OptionRight" NOT NULL,
    "exchange" TEXT NOT NULL,
    "tradeTimestamp" TIMESTAMP(3) NOT NULL,
    "price" DECIMAL(12,4) NOT NULL,
    "size" INTEGER NOT NULL,
    "notionalValue" DECIMAL(18,2) NOT NULL,
    "bidAtTrade" DECIMAL(12,4),
    "askAtTrade" DECIMAL(12,4),
    "aggressorSide" "AggressorSide" NOT NULL DEFAULT 'UNKNOWN',
    "sourceProviderId" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_flow_prints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options_open_interest_snapshots" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "expiry" DATE NOT NULL,
    "strike" DECIMAL(12,4) NOT NULL,
    "optionType" "OptionRight" NOT NULL,
    "openInterest" INTEGER NOT NULL,
    "snapshotDate" DATE NOT NULL,
    "sourceProviderId" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_open_interest_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options_signals" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "expiry" DATE NOT NULL,
    "strike" DECIMAL(12,4) NOT NULL,
    "optionType" "OptionRight" NOT NULL,
    "signalType" "OptionsSignalType" NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggressorSide" "AggressorSide" NOT NULL,
    "totalVolume" INTEGER NOT NULL,
    "baselineVolume" INTEGER,
    "volumeMultiple" DECIMAL(8,2),
    "notionalValue" DECIMAL(18,2) NOT NULL,
    "sweepExchangeCount" INTEGER,
    "largestSinglePrintSize" INTEGER,
    "openInterestPriorSession" INTEGER,
    "openInterestDelta" INTEGER,
    "oiConfirmationStatus" "OiConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "putCallSkewZScore" DECIMAL(6,3),
    "anomalyScore" DECIMAL(5,2) NOT NULL,
    "explanation" TEXT NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "methodologyVersion" TEXT NOT NULL,
    "sourceProviderId" TEXT NOT NULL,
    "canonicalEventId" TEXT,
    "worldMemoryRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "options_flow_prints_symbol_tradeTimestamp_idx" ON "options_flow_prints"("symbol", "tradeTimestamp");

-- CreateIndex
CREATE INDEX "options_flow_prints_symbol_expiry_strike_optionType_idx" ON "options_flow_prints"("symbol", "expiry", "strike", "optionType");

-- CreateIndex
CREATE INDEX "options_open_interest_snapshots_symbol_snapshotDate_idx" ON "options_open_interest_snapshots"("symbol", "snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "options_open_interest_snapshots_symbol_expiry_strike_option_key" ON "options_open_interest_snapshots"("symbol", "expiry", "strike", "optionType", "snapshotDate");

-- CreateIndex
CREATE INDEX "options_signals_symbol_detectedAt_idx" ON "options_signals"("symbol", "detectedAt");

-- CreateIndex
CREATE INDEX "options_signals_signalType_idx" ON "options_signals"("signalType");

-- CreateIndex
CREATE INDEX "options_signals_symbol_expiry_strike_optionType_idx" ON "options_signals"("symbol", "expiry", "strike", "optionType");
