-- CreateTable
CREATE TABLE "StakeCommitment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "amount" INTEGER NOT NULL,
    "maxSocialMediaMin" INTEGER NOT NULL,
    "minExposureTasks" INTEGER NOT NULL,
    "minPhoneFreeBlocks" INTEGER NOT NULL,
    "evaluated" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" DATETIME,
    "outcome" TEXT,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" DATETIME,
    "proofUrl" TEXT,
    "cheated" BOOLEAN NOT NULL DEFAULT false,
    "antiCharityName" TEXT NOT NULL DEFAULT 'Trump 2024 Campaign',
    "antiCharityUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StakeCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StakeCommitment_userId_startDate_idx" ON "StakeCommitment"("userId", "startDate");
