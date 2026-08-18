import { Club } from '../../domain/entities/club.entity';
import { ClubResponseDto } from '../dtos/club-response.dto';

/** Translates the Club domain entity into its transport representation. */
export class ClubMapper {
  static toResponse(club: Club): ClubResponseDto {
    return {
      id: club.id,
      name: club.name,
      city: club.city,
      logoUrl: club.logoUrl,
      createdAt: club.createdAt.toISOString(),
      updatedAt: club.updatedAt.toISOString(),
    };
  }
}
