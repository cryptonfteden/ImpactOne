-- CreateEnum
CREATE TYPE "InvestorExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "InvestmentGoal" AS ENUM ('WEALTH', 'RETIREMENT', 'PASSIVE_INCOME', 'LEARNING', 'HOUSE', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskTolerance" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "InvestmentHorizonBucket" AS ENUM ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM');

-- CreateTable
CREATE TABLE "investor_profiles" (
    "id" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "country" TEXT,
    "experienceLevel" "InvestorExperienceLevel",
    "monthlyInvestmentAmount" DECIMAL(14,2),
    "investmentGoal" "InvestmentGoal",
    "riskTolerance" "RiskTolerance",
    "investmentHorizon" "InvestmentHorizonBucket",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_profiles_pkey" PRIMARY KEY ("id")
);
