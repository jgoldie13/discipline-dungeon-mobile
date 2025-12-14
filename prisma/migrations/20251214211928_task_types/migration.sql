-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "taskTypeId" TEXT;

-- CreateTable
CREATE TABLE "TaskType" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "xpBase" INTEGER NOT NULL DEFAULT 60,
    "xpPerMinute" INTEGER NOT NULL DEFAULT 1,
    "xpCap" INTEGER NOT NULL DEFAULT 60,
    "xpMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "buildMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskType_userId_isArchived_idx" ON "TaskType"("userId", "isArchived");

-- CreateIndex
CREATE INDEX "TaskType_userId_sortOrder_idx" ON "TaskType"("userId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TaskType_userId_key_key" ON "TaskType"("userId", "key");

-- CreateIndex
CREATE INDEX "Task_taskTypeId_idx" ON "Task"("taskTypeId");

-- AddForeignKey
ALTER TABLE "TaskType" ADD CONSTRAINT "TaskType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_taskTypeId_fkey" FOREIGN KEY ("taskTypeId") REFERENCES "TaskType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
