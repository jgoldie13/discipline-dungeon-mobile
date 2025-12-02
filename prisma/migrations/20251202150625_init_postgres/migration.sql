-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dailySocialMediaLimit" INTEGER NOT NULL DEFAULT 30,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastStreakDate" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneDailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "socialMediaMin" INTEGER NOT NULL,
    "limitMin" INTEGER NOT NULL,
    "overage" INTEGER NOT NULL DEFAULT 0,
    "penalty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneDailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Urge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT,
    "replacementTask" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Urge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneFreeBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "durationMin" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifyMethod" TEXT NOT NULL DEFAULT 'honor_system',
    "xpEarned" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PhoneFreeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "durationMin" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageViolation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalOverage" INTEGER NOT NULL,
    "penalty" TEXT NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationSec" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MicroTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakeCommitment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxSocialMediaMin" INTEGER NOT NULL,
    "minExposureTasks" INTEGER NOT NULL,
    "minPhoneFreeBlocks" INTEGER NOT NULL,
    "evaluated" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "proofUrl" TEXT,
    "cheated" BOOLEAN NOT NULL DEFAULT false,
    "antiCharityName" TEXT NOT NULL DEFAULT 'Trump 2024 Campaign',
    "antiCharityUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StakeCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "relatedModel" TEXT,
    "relatedId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreakHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "streakCount" INTEGER NOT NULL,
    "broken" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "underLimit" BOOLEAN NOT NULL DEFAULT true,
    "violationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreakHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneDailyLog_date_key" ON "PhoneDailyLog"("date");

-- CreateIndex
CREATE INDEX "PhoneDailyLog_userId_date_idx" ON "PhoneDailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX "Urge_userId_timestamp_idx" ON "Urge"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "PhoneFreeBlock_userId_startTime_idx" ON "PhoneFreeBlock"("userId", "startTime");

-- CreateIndex
CREATE INDEX "Task_userId_completed_createdAt_idx" ON "Task"("userId", "completed", "createdAt");

-- CreateIndex
CREATE INDEX "UsageViolation_userId_date_idx" ON "UsageViolation"("userId", "date");

-- CreateIndex
CREATE INDEX "StakeCommitment_userId_startDate_idx" ON "StakeCommitment"("userId", "startDate");

-- CreateIndex
CREATE INDEX "XpEvent_userId_createdAt_idx" ON "XpEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpEvent_relatedModel_relatedId_idx" ON "XpEvent"("relatedModel", "relatedId");

-- CreateIndex
CREATE UNIQUE INDEX "StreakHistory_date_key" ON "StreakHistory"("date");

-- CreateIndex
CREATE INDEX "StreakHistory_userId_date_idx" ON "StreakHistory"("userId", "date");

-- AddForeignKey
ALTER TABLE "PhoneDailyLog" ADD CONSTRAINT "PhoneDailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Urge" ADD CONSTRAINT "Urge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneFreeBlock" ADD CONSTRAINT "PhoneFreeBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageViolation" ADD CONSTRAINT "UsageViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakeCommitment" ADD CONSTRAINT "StakeCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpEvent" ADD CONSTRAINT "XpEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreakHistory" ADD CONSTRAINT "StreakHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
