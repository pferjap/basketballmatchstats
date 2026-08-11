import { Inject, Injectable } from '@nestjs/common';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../domain/interfaces/match.repository.interface';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';

@Injectable()
export class DeleteMatchUseCase {
  constructor(
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const match = await this.matchRepository.findById(id);
    if (!match) {
      throw new MatchNotFoundException(id);
    }
    await this.matchRepository.delete(id);
  }
}
