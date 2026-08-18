import { Player } from '../../domain/entities/player.entity';
import { PlayerResponseDto } from '../dtos/player-response.dto';

export class PlayerMapper {
  static toResponse(player: Player): PlayerResponseDto {
    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      jerseyNumber: player.jerseyNumber,
      position: player.position,
      teamId: player.teamId,
      photoUrl: player.photoUrl,
      createdAt: player.createdAt.toISOString(),
      updatedAt: player.updatedAt.toISOString(),
    };
  }
}
