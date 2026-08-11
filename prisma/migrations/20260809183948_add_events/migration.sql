-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('POINTS_MADE', 'POINTS_MISSED', 'REBOUND_OFFENSIVE', 'REBOUND_DEFENSIVE', 'ASSIST', 'TURNOVER', 'STEAL', 'BLOCK', 'FOUL_PERSONAL', 'FOUL_TECHNICAL', 'FOUL_UNSPORTSMANLIKE', 'FOUL_DISQUALIFYING', 'FREE_THROW_AWARDED', 'SUBSTITUTION', 'TIMEOUT', 'QUARTER_START', 'QUARTER_END');

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "matchId" UUID NOT NULL,
    "teamId" UUID NOT NULL,
    "playerId" UUID,
    "eventType" "EventType" NOT NULL,
    "period" INTEGER NOT NULL,
    "gameClock" TEXT NOT NULL,
    "coordinates" JSONB,
    "metadata" JSONB,
    "isVoided" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "events_matchId_eventType_idx" ON "events"("matchId", "eventType");

-- CreateIndex
CREATE INDEX "events_matchId_playerId_idx" ON "events"("matchId", "playerId");

-- CreateIndex
CREATE INDEX "events_matchId_teamId_idx" ON "events"("matchId", "teamId");

-- CreateIndex
CREATE INDEX "events_matchId_period_idx" ON "events"("matchId", "period");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
