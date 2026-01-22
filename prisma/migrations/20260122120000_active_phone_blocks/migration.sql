CREATE TYPE "PhoneFreeBlockStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

ALTER TABLE "PhoneFreeBlock"
ADD COLUMN "status" "PhoneFreeBlockStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "abandonedAt" TIMESTAMP(3);

ALTER TABLE "Urge"
ADD COLUMN "phoneFreeBlockId" TEXT,
ADD COLUMN "intensity" INTEGER;

ALTER TABLE "Urge"
ADD CONSTRAINT "Urge_phoneFreeBlockId_fkey"
FOREIGN KEY ("phoneFreeBlockId") REFERENCES "PhoneFreeBlock"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PhoneFreeBlock_userId_status_idx" ON "PhoneFreeBlock"("userId", "status");

UPDATE "PhoneFreeBlock"
SET "status" = CASE
  WHEN "endTime" IS NOT NULL THEN 'COMPLETED'::"PhoneFreeBlockStatus"
  WHEN "endTime" IS NULL
    AND "startTime" IS NOT NULL
    AND "durationMin" IS NOT NULL
    AND EXTRACT(EPOCH FROM (NOW() - "startTime")) <= ("durationMin" * 60 + 120)
  THEN 'ACTIVE'::"PhoneFreeBlockStatus"
  ELSE 'ABANDONED'::"PhoneFreeBlockStatus"
END;

CREATE UNIQUE INDEX "PhoneFreeBlock_active_user_unique"
ON "PhoneFreeBlock"("userId")
WHERE "status" = 'ACTIVE';
