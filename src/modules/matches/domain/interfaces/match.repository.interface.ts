import type { MatchEntity } from '../entities/match.entity';

export interface MatchFindManyParams {
  clubId?: string;
  status?: string;
  skip?: number;
  take?: number;
}

export interface CreateMatchData {
  clubId: string;
  homeTeamId: string;
  awayTeamId: string;
  scheduledAt: Date;
  totalPeriods?: number;
  periodDurationMinutes?: number;
}

export interface UpdateMatchData {
  status?: string;
  startedAt?: Date;
  finishedAt?: Date;
  period?: number;
  gameClock?: string;
  homeTeamId?: string;
  awayTeamId?: string;
  scheduledAt?: Date;
  totalPeriods?: number;
  periodDurationMinutes?: number;
  suspensionReason?: string | null;
}

export interface IMatchRepository {
  create(data: CreateMatchData): Promise<MatchEntity>;
  findById(id: string): Promise<MatchEntity | null>;
  findMany(params: MatchFindManyParams): Promise<MatchEntity[]>;
  count(params: MatchFindManyParams): Promise<number>;
  update(id: string, data: UpdateMatchData): Promise<MatchEntity>;
  delete(id: string): Promise<void>;
}

export const MATCH_REPOSITORY = Symbol('MATCH_REPOSITORY');
