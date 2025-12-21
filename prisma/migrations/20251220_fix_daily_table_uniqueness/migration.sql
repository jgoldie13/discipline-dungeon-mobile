-- Fix daily table uniqueness constraints for multi-user support
-- Convert date columns to date-only and add composite unique constraints

-- PhoneDailyLog: Remove global unique, convert to DATE, add composite unique
ALTER TABLE "PhoneDailyLog" DROP CONSTRAINT IF EXISTS "PhoneDailyLog_date_key";
ALTER TABLE "PhoneDailyLog" ALTER COLUMN "date" TYPE DATE USING date::date;
CREATE UNIQUE INDEX IF NOT EXISTS "PhoneDailyLog_userId_date_key" ON "PhoneDailyLog"("userId", "date");

-- StreakHistory: Remove global unique, convert to DATE, add composite unique
ALTER TABLE "StreakHistory" DROP CONSTRAINT IF EXISTS "StreakHistory_date_key";
ALTER TABLE "StreakHistory" ALTER COLUMN "date" TYPE DATE USING date::date;
CREATE UNIQUE INDEX IF NOT EXISTS "StreakHistory_userId_date_key" ON "StreakHistory"("userId", "date");

-- DailyProtocol: Remove global unique, convert to DATE, add composite unique
ALTER TABLE "DailyProtocol" DROP CONSTRAINT IF EXISTS "DailyProtocol_date_key";
ALTER TABLE "DailyProtocol" ALTER COLUMN "date" TYPE DATE USING date::date;
CREATE UNIQUE INDEX IF NOT EXISTS "DailyProtocol_userId_date_key" ON "DailyProtocol"("userId", "date");
