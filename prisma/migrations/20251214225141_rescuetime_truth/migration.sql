-- CreateTable
CREATE TABLE "RescueTimeConnection" (
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyEncrypted" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescueTimeConnection_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RescueTimeDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "verifiedMinutes" INTEGER NOT NULL,
    "totalMinutes" INTEGER,
    "raw" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RescueTimeDaily_pkey" PRIMARY KEY ("id")
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
    "violationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruthCheckDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RescueTimeDaily_userId_date_idx" ON "RescueTimeDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RescueTimeDaily_userId_date_key" ON "RescueTimeDaily"("userId", "date");

-- CreateIndex
CREATE INDEX "TruthCheckDaily_userId_date_idx" ON "TruthCheckDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TruthCheckDaily_userId_date_key" ON "TruthCheckDaily"("userId", "date");

-- AddForeignKey
ALTER TABLE "RescueTimeConnection" ADD CONSTRAINT "RescueTimeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueTimeDaily" ADD CONSTRAINT "RescueTimeDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "UsageViolation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
