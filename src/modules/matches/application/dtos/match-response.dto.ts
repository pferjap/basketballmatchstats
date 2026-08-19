import { MatchStatus } from '../../domain/enums/match-status.enum';

export interface MatchResponseDto {
  id: string;
  clubId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  period: number;
  gameClock: string;
  totalPeriods: number;
  periodDurationMinutes: number;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}
