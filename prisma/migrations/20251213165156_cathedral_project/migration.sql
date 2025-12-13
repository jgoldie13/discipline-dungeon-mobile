-- CreateTable
CREATE TABLE "UserProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintSegment" (
    "blueprintId" TEXT NOT NULL,
    "segmentKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlueprintSegment_pkey" PRIMARY KEY ("blueprintId","segmentKey")
);

-- CreateTable
CREATE TABLE "UserProjectProgress" (
    "id" TEXT NOT NULL,
    "userProjectId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "segmentKey" TEXT NOT NULL,
    "pointsApplied" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProjectProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildEvent" (
    "id" TEXT NOT NULL,
    "userProjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "blueprintId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "allocations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuildEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProject_userId_blueprintId_key" ON "UserProject"("userId", "blueprintId");

-- CreateIndex
CREATE UNIQUE INDEX "BlueprintSegment_blueprintId_orderIndex_key" ON "BlueprintSegment"("blueprintId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "UserProjectProgress_userProjectId_segmentKey_key" ON "UserProjectProgress"("userProjectId", "segmentKey");

-- CreateIndex
CREATE INDEX "BuildEvent_userId_createdAt_idx" ON "BuildEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BuildEvent_blueprintId_createdAt_idx" ON "BuildEvent"("blueprintId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserProject" ADD CONSTRAINT "UserProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectProgress" ADD CONSTRAINT "UserProjectProgress_userProjectId_fkey" FOREIGN KEY ("userProjectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProjectProgress" ADD CONSTRAINT "UserProjectProgress_blueprintId_segmentKey_fkey" FOREIGN KEY ("blueprintId", "segmentKey") REFERENCES "BlueprintSegment"("blueprintId", "segmentKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEvent" ADD CONSTRAINT "BuildEvent_userProjectId_fkey" FOREIGN KEY ("userProjectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildEvent" ADD CONSTRAINT "BuildEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
