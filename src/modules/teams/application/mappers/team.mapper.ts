import { Team } from '../../domain/entities/team.entity';
import { TeamResponseDto } from '../dtos/team-response.dto';

/** Translates the Team domain entity into its transport representation. */
export class TeamMapper {
  static toResponse(team: Team): TeamResponseDto {
    return {
      id: team.id,
      name: team.name,
      clubId: team.clubId,
      logoUrl: team.logoUrl,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }
}
