-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "dailySocialMediaLimit" INTEGER NOT NULL DEFAULT 30
);

-- CreateTable
CREATE TABLE "PhoneDailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "socialMediaMin" INTEGER NOT NULL,
    "limitMin" INTEGER NOT NULL,
    "overage" INTEGER NOT NULL DEFAULT 0,
    "penalty" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PhoneDailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Urge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger" TEXT,
    "replacementTask" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Urge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PhoneFreeBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "durationMin" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifyMethod" TEXT NOT NULL DEFAULT 'honor_system',
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PhoneFreeBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "durationMin" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATETIME,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UsageViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "totalOverage" INTEGER NOT NULL,
    "penalty" TEXT NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MicroTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationSec" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
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
