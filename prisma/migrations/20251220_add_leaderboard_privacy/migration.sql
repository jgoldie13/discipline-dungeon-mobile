-- Add leaderboard privacy fields to User table
ALTER TABLE "User" ADD COLUMN "isPublicProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
