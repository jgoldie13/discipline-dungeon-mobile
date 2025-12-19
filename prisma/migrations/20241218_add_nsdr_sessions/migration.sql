-- CreateTable
CREATE TABLE "NsdrSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'nsdr',
    "durationMin" INTEGER NOT NULL DEFAULT 10,
    "hpRestored" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NsdrSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NsdrSession_userId_completedAt_idx" ON "NsdrSession"("userId", "completedAt");

-- AddForeignKey
ALTER TABLE "NsdrSession" ADD CONSTRAINT "NsdrSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
