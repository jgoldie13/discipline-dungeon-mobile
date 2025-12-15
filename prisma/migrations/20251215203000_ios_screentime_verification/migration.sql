-- AlterTable
ALTER TABLE "XpEvent" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
ALTER TABLE "XpEvent" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IosScreenTimeConnection" (
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
CREATE TABLE IF NOT EXISTS "IosScreenTimeDaily" (
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
CREATE TABLE IF NOT EXISTS "TruthCheckDaily" (
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
CREATE TABLE IF NOT EXISTS "TruthViolation" (
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

-- Ensure TruthCheckDaily matches current app expectations (supports pre-existing tables)
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "id" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "date" DATE;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "reportedMinutes" INTEGER;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "verifiedMinutes" INTEGER;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "deltaMinutes" INTEGER;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "sourceRecordId" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "violationId" TEXT;
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3);
ALTER TABLE "TruthCheckDaily" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

DO $$
BEGIN
  -- Backfill required non-null fields when the table pre-existed and had missing/null values.
  BEGIN
    UPDATE "TruthCheckDaily" SET "id" = md5(random()::text || clock_timestamp()::text) WHERE "id" IS NULL;
  EXCEPTION WHEN others THEN
    -- If the existing "id" column isn't TEXT-compatible, do not mutate it here.
  END;

  BEGIN
    UPDATE "TruthCheckDaily" SET "status" = 'missing_verification' WHERE "status" IS NULL;
  EXCEPTION WHEN others THEN
  END;

  BEGIN
    UPDATE "TruthCheckDaily" SET "source" = 'ios_screentime' WHERE "source" IS NULL;
  EXCEPTION WHEN others THEN
  END;

  BEGIN
    UPDATE "TruthCheckDaily" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;
  EXCEPTION WHEN others THEN
  END;

  BEGIN
    UPDATE "TruthCheckDaily" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
  EXCEPTION WHEN others THEN
  END;

  BEGIN
    ALTER TABLE "TruthCheckDaily" ALTER COLUMN "source" SET DEFAULT 'ios_screentime';
  EXCEPTION WHEN others THEN
  END;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IosScreenTimeConnection_userId_key" ON "IosScreenTimeConnection"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IosScreenTimeDaily_userId_date_idx" ON "IosScreenTimeDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IosScreenTimeDaily_userId_date_key" ON "IosScreenTimeDaily"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TruthCheckDaily_userId_date_idx" ON "TruthCheckDaily"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TruthCheckDaily_userId_date_key" ON "TruthCheckDaily"("userId", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TruthViolation_userId_date_idx" ON "TruthViolation"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TruthViolation_userId_date_source_policyVersion_key" ON "TruthViolation"("userId", "date", "source", "policyVersion");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "XpEvent_dedupeKey_key" ON "XpEvent"("dedupeKey");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IosScreenTimeConnection_userId_fkey'
  ) THEN
    ALTER TABLE "IosScreenTimeConnection" ADD CONSTRAINT "IosScreenTimeConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'IosScreenTimeDaily_userId_fkey'
  ) THEN
    ALTER TABLE "IosScreenTimeDaily" ADD CONSTRAINT "IosScreenTimeDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TruthCheckDaily_userId_fkey'
  ) THEN
    BEGIN
      ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      -- Existing rows may not match current user table; treat FK as best-effort only.
    END;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TruthCheckDaily_violationId_fkey'
  ) THEN
    BEGIN
      ALTER TABLE "TruthCheckDaily" ADD CONSTRAINT "TruthCheckDaily_violationId_fkey" FOREIGN KEY ("violationId") REFERENCES "TruthViolation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    EXCEPTION WHEN others THEN
      -- If existing data cannot satisfy the FK, keep the column but skip the constraint.
    END;
  END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TruthViolation_userId_fkey'
  ) THEN
    ALTER TABLE "TruthViolation" ADD CONSTRAINT "TruthViolation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
