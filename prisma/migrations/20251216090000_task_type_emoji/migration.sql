-- Add emoji support for task types
ALTER TABLE "TaskType" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '📋';

-- Backfill defaults for existing rows based on key
UPDATE "TaskType" SET "emoji" = '🎯' WHERE "key" = 'exposure';
UPDATE "TaskType" SET "emoji" = '💼' WHERE "key" = 'job_search';
UPDATE "TaskType" SET "emoji" = '🔄' WHERE "key" = 'habit';
UPDATE "TaskType" SET "emoji" = '⚔️' WHERE "key" = 'boss';
UPDATE "TaskType" SET "emoji" = '📋' WHERE "key" = 'other';
