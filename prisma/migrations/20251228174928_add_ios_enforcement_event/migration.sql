-- CreateTable
CREATE TABLE "IosEnforcementEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "eventTs" TIMESTAMP(3) NOT NULL,
    "planHash" TEXT,
    "timezone" TEXT,
    "dailyCapMinutes" INTEGER,
    "note" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IosEnforcementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IosEnforcementEvent_userId_eventTs_idx" ON "IosEnforcementEvent"("userId", "eventTs");

-- CreateIndex
CREATE UNIQUE INDEX "IosEnforcementEvent_userId_dedupeKey_key" ON "IosEnforcementEvent"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "IosEnforcementEvent" ADD CONSTRAINT "IosEnforcementEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropTable (cleanup old RescueTime tables)
DROP TABLE IF EXISTS "RescueTimeConnection";
DROP TABLE IF EXISTS "RescueTimeDaily";
