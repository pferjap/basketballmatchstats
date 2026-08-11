import { Inject, Injectable } from '@nestjs/common';
import {
  CLUB_REPOSITORY,
  type IClubRepository,
} from '../../domain/interfaces/club.repository.interface';
import { Club } from '../../domain/entities/club.entity';

export interface ListClubsResult {
  data: Club[];
  total: number;
}

@Injectable()
export class ListClubsUseCase {
  constructor(
    @Inject(CLUB_REPOSITORY)
    private readonly clubRepository: IClubRepository,
  ) {}

  async execute(
    page: number,
    limit: number,
    clubId?: string,
  ): Promise<ListClubsResult> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.clubRepository.findMany({ skip, take: limit, clubId }),
      this.clubRepository.count(clubId),
    ]);

    return { data, total };
  }
}
