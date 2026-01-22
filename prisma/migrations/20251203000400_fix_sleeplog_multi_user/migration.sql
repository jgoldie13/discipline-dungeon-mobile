-- Fix SleepLog multi-user bug: change date unique → (userId, date) unique
-- Add audit trail fields

-- Step 1: Drop the existing unique constraint on date
ALTER TABLE "SleepLog" DROP CONSTRAINT IF EXISTS "SleepLog_date_key";

-- Step 2: Add edit tracking fields
ALTER TABLE "SleepLog" ADD COLUMN IF NOT EXISTS "editCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SleepLog" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 3: Change date column to DATE type (if needed - may already be compatible)
-- Note: This is safe because DateTime in Prisma maps to TIMESTAMP(3) in Postgres
-- and we're adding @db.Date which will use DATE type for new inserts

-- Step 4: Add composite unique constraint (userId, date)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SleepLog_userId_date_key'
    ) THEN
        ALTER TABLE "SleepLog" ADD CONSTRAINT "SleepLog_userId_date_key" UNIQUE ("userId", "date");
    END IF;
END$$;

-- Note: The existing index on (userId, date) remains
