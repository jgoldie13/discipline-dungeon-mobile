-- AlterTable
ALTER TABLE "XpEvent" ADD COLUMN     "dedupeKey" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "IosScreenTimeConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "lastSyncAt" TIMESTAMP(3),
    "selection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IosScreenTimeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IosScreenTimeDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IosScreenTimeDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruthCheckDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reportedMinutes" INTEGER,
    "verifiedMinutes" INTEGER,
    "deltaMinutes" INTEGER,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ios_screentime',
    "sourceRecordId" TEXT,
    "violationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruthCheckDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TruthViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL DEFAULT 'v1',
    "thresholdMinutes" INTEGER NOT NULL,
    "reportedMinutes" INTEGER NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,
    "deltaMinutes" INTEGER NOT NULL,
    "penaltyXp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TruthViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IosScreenTimeConnection_userId_key" ON "IosScreenTimeConnection"("userId");

-- CreateIndex
CREATE INDEX "IosScreenTimeDaily_userId_date_idx" ON "IosScreenTimeDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "IosScreenTimeDaily_userId_date_key" ON "IosScreenTimeDaily"("userId", "date");

-- CreateIndex
CREATE INDEX "TruthCheckDaily_userId_date_idx" ON "TruthCheckDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TruthCheckDaily_userId_date_key" ON "TruthCheckDaily"("userId", "date");

-- CreateIndex
CREATE INDEX "TruthViolation_userId_date_idx" ON "TruthViolation"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TruthViolation_userId_date_source_policyVersion_key" ON "TruthViolation"("userId", "date", "source", "policyVersion");

-- CreateIndex
CREATE UNIQUE INDEX "XpEvent_dedupeKey_key" ON "XpEvent"("dedupeKey");

-- AddForeignKey
ALTER TABLE "IosScreenTimeConnection" ADD CONSTRAINT "IosScreenTimeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IosScreenTimeDaily" ADD CONSTRAINT "IosScreenTimeDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "TruthViolation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruthViolation" ADD CONSTRAINT "TruthViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

