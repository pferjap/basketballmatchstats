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
  createdAt: string;
  updatedAt: string;
}
