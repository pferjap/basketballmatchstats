import { MatchStatus } from '../enums/match-status.enum';

export interface MatchProperties {
  id: string;
  clubId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: MatchStatus;
  scheduledAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  period: number;
  gameClock: string;
  totalPeriods: number;
  periodDurationMinutes: number;
  suspensionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MatchEntity {
  readonly id: string;
  readonly clubId: string;
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly status: MatchStatus;
  readonly scheduledAt: Date;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly period: number;
  readonly gameClock: string;
  readonly totalPeriods: number;
  readonly periodDurationMinutes: number;
  readonly suspensionReason: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: MatchProperties) {
    this.id = properties.id;
    this.clubId = properties.clubId;
    this.homeTeamId = properties.homeTeamId;
    this.awayTeamId = properties.awayTeamId;
    this.status = properties.status;
    this.scheduledAt = properties.scheduledAt;
    this.startedAt = properties.startedAt;
    this.finishedAt = properties.finishedAt;
    this.period = properties.period;
    this.gameClock = properties.gameClock;
    this.totalPeriods = properties.totalPeriods;
    this.periodDurationMinutes = properties.periodDurationMinutes;
    this.suspensionReason = properties.suspensionReason;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }

  canStart(): boolean {
    return this.status === MatchStatus.SCHEDULED;
  }

  canFinish(): boolean {
    return this.status === MatchStatus.ONGOING;
  }

  canCancel(): boolean {
    return (
      this.status === MatchStatus.SCHEDULED ||
      this.status === MatchStatus.ONGOING ||
      this.status === MatchStatus.SUSPENDED ||
      this.status === MatchStatus.POSTPONED
    );
  }

  canPostpone(): boolean {
    return (
      this.status === MatchStatus.SCHEDULED ||
      this.status === MatchStatus.ONGOING
    );
  }

  canSuspend(): boolean {
    return this.status === MatchStatus.ONGOING;
  }
}
