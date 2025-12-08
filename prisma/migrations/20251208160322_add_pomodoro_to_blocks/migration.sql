-- AlterTable
ALTER TABLE "PhoneFreeBlock" ADD COLUMN     "pomodoroBreakMin" INTEGER,
ADD COLUMN     "pomodoroEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pomodoroFocusMin" INTEGER;
