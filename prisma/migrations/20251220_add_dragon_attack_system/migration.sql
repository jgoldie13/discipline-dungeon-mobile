-- Add DragonAttack system and build event metadata

ALTER TABLE "BuildEvent" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
ALTER TABLE "BuildEvent" ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE TABLE IF NOT EXISTS "DragonAttack" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userProjectId" TEXT NOT NULL,
  "blueprintId" TEXT NOT NULL,
  "segmentKey" TEXT NOT NULL,
  "damageAmount" INTEGER NOT NULL,
  "triggerType" TEXT NOT NULL,
  "severity" INTEGER NOT NULL,
  "consecutiveDays" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DragonAttack_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DragonAttack_dedupeKey_key" UNIQUE ("dedupeKey"),
  CONSTRAINT "DragonAttack_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DragonAttack_userProjectId_fkey" FOREIGN KEY ("userProjectId") REFERENCES "UserProject"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DragonAttack_blueprintId_segmentKey_fkey" FOREIGN KEY ("blueprintId", "segmentKey") REFERENCES "BlueprintSegment"("blueprintId", "segmentKey") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "DragonAttack_userId_createdAt_idx" ON "DragonAttack"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "DragonAttack_userProjectId_createdAt_idx" ON "DragonAttack"("userProjectId", "createdAt");
CREATE INDEX IF NOT EXISTS "DragonAttack_triggerType_createdAt_idx" ON "DragonAttack"("triggerType", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BuildEvent_dedupeKey_key" ON "BuildEvent"("dedupeKey");
