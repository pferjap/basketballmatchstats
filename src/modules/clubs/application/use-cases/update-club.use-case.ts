import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import { Club } from '../../domain/entities/club.entity';
import { ClubNotFoundException } from '../../domain/exceptions/club-not-found.exception';
import { UpdateClubDto } from '../dtos/update-club.dto';

@Injectable()
export class UpdateClubUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(id: string, dto: UpdateClubDto): Promise<Club> {
    const exists = await this.clubRepository.existsById(id);

    if (!exists) {
      throw new ClubNotFoundException(id);
    }

    return this.clubRepository.update(id, {
      name: dto.name,
      city: dto.city,
    });
  }
}
