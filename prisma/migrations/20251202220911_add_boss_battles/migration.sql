-- AlterTable
ALTER TABLE "PhoneFreeBlock" ADD COLUMN     "damageDealt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isBossBlock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linkedBossId" TEXT,
ADD COLUMN     "timeOfDay" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "bossDifficulty" TEXT,
ADD COLUMN     "bossHp" INTEGER,
ADD COLUMN     "bossHpRemaining" INTEGER,
ADD COLUMN     "isBoss" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "optimalWindow" TEXT,
ADD COLUMN     "scheduledTime" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentHp" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "lastHpUpdate" TIMESTAMP(3),
ADD COLUMN     "targetBedtime" TEXT,
ADD COLUMN     "targetWakeTime" TEXT,
ADD COLUMN     "wakeWindowMin" INTEGER NOT NULL DEFAULT 15;

-- CreateTable
CREATE TABLE "BossBlock" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "damageDealt" INTEGER NOT NULL,
    "timeOfDay" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "userHp" INTEGER NOT NULL,
    "blockDurationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BossBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SleepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bedtime" TIMESTAMP(3) NOT NULL,
    "waketime" TIMESTAMP(3) NOT NULL,
    "sleepDurationMin" INTEGER NOT NULL,
    "subjectiveRested" INTEGER NOT NULL,
    "sleepQuality" INTEGER NOT NULL DEFAULT 0,
    "wakeOnTime" BOOLEAN NOT NULL DEFAULT false,
    "wakeVarianceMin" INTEGER NOT NULL DEFAULT 0,
    "hpCalculated" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SleepLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyProtocol" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "wokeOnTime" BOOLEAN NOT NULL DEFAULT false,
    "gotMorningLight" BOOLEAN NOT NULL DEFAULT false,
    "drankWater" BOOLEAN NOT NULL DEFAULT false,
    "delayedCaffeine" BOOLEAN NOT NULL DEFAULT false,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "hpBonus" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyProtocol_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BossBlock_taskId_createdAt_idx" ON "BossBlock"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "BossBlock_blockId_idx" ON "BossBlock"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "SleepLog_date_key" ON "SleepLog"("date");

-- CreateIndex
CREATE INDEX "SleepLog_userId_date_idx" ON "SleepLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyProtocol_date_key" ON "DailyProtocol"("date");

-- CreateIndex
CREATE INDEX "DailyProtocol_userId_date_idx" ON "DailyProtocol"("userId", "date");

-- AddForeignKey
ALTER TABLE "BossBlock" ADD CONSTRAINT "BossBlock_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BossBlock" ADD CONSTRAINT "BossBlock_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "PhoneFreeBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyProtocol" ADD CONSTRAINT "DailyProtocol_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
