import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import { Club } from '../../domain/entities/club.entity';
import { CreateClubDto } from '../dtos/create-club.dto';

@Injectable()
export class CreateClubUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  execute(dto: CreateClubDto): Promise<Club> {
    return this.clubRepository.create({
      name: dto.name,
      city: dto.city ?? null,
    });
  }
}
