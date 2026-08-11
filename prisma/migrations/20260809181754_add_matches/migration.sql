-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'FINISHED');

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "homeTeamId" UUID NOT NULL,
    "awayTeamId" UUID NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "period" INTEGER NOT NULL DEFAULT 0,
    "gameClock" TEXT NOT NULL DEFAULT '00:00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_clubId_idx" ON "matches"("clubId");

-- CreateIndex
CREATE INDEX "matches_homeTeamId_idx" ON "matches"("homeTeamId");

-- CreateIndex
CREATE INDEX "matches_awayTeamId_idx" ON "matches"("awayTeamId");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
