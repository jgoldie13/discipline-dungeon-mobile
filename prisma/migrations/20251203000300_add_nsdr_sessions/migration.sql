-- CreateTable
CREATE TABLE IF NOT EXISTS "NsdrSession" (
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
CREATE INDEX IF NOT EXISTS "NsdrSession_userId_completedAt_idx" ON "NsdrSession"("userId", "completedAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'NsdrSession_userId_fkey'
    ) THEN
        ALTER TABLE "NsdrSession" ADD CONSTRAINT "NsdrSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
