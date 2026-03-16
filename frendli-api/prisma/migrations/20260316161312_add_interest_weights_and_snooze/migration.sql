-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "interestWeights" JSONB;

-- CreateTable
CREATE TABLE "Snooze" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Snooze_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snooze_userId_expiresAt_idx" ON "Snooze"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Snooze_userId_targetId_key" ON "Snooze"("userId", "targetId");

-- AddForeignKey
ALTER TABLE "Snooze" ADD CONSTRAINT "Snooze_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Snooze" ADD CONSTRAINT "Snooze_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
