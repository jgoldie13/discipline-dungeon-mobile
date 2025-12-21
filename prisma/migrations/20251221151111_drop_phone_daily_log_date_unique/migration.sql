-- Drop the incorrect global unique index on PhoneDailyLog.date
-- This index was incorrectly created in the initial migration and causes P2002 errors
-- when multiple users try to log phone usage on the same date.
-- The correct uniqueness is enforced by PhoneDailyLog_userId_date_key (userId, date).

DROP INDEX IF EXISTS "PhoneDailyLog_date_key";
