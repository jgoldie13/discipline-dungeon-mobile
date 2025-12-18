-- AlterTable: Add Energy Equation fields to SleepLog
ALTER TABLE "SleepLog" ADD COLUMN "caffeinePastNoon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SleepLog" ADD COLUMN "caffeineHoursBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SleepLog" ADD COLUMN "screenMinBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SleepLog" ADD COLUMN "gotMorningLight" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SleepLog" ADD COLUMN "exercisedToday" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SleepLog" ADD COLUMN "exerciseHoursBefore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SleepLog" ADD COLUMN "lastMealHoursBefore" INTEGER NOT NULL DEFAULT 0;
