import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchResponseDto } from '../../application/dtos/match-response.dto';

export class MatchMapper {
  static toResponse(entity: MatchEntity): MatchResponseDto {
    return {
      id: entity.id,
      clubId: entity.clubId,
      homeTeamId: entity.homeTeamId,
      awayTeamId: entity.awayTeamId,
      status: entity.status,
      scheduledAt: entity.scheduledAt.toISOString(),
      startedAt: entity.startedAt ? entity.startedAt.toISOString() : null,
      finishedAt: entity.finishedAt ? entity.finishedAt.toISOString() : null,
      period: entity.period,
      gameClock: entity.gameClock,
      totalPeriods: entity.totalPeriods,
      periodDurationMinutes: entity.periodDurationMinutes,
      suspensionReason: entity.suspensionReason,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
