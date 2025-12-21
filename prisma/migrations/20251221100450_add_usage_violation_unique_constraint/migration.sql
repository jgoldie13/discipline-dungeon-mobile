-- Add unique constraint and updatedAt column to UsageViolation
ALTER TABLE "UsageViolation" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create unique constraint on (userId, date)
CREATE UNIQUE INDEX IF NOT EXISTS "UsageViolation_userId_date_key" ON "UsageViolation"("userId", "date");
