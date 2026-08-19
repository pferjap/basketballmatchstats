/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CreateMatchUseCase } from './create-match.use-case';
import { GetMatchUseCase } from './get-match.use-case';
import { UpdateMatchUseCase } from './update-match.use-case';
import { StartMatchUseCase } from './start-match.use-case';
import { FinishMatchUseCase } from './finish-match.use-case';
import { ListMatchesUseCase } from './list-matches.use-case';
import { DeleteMatchUseCase } from './delete-match.use-case';
import { MatchEntity } from '../../domain/entities/match.entity';
import { MatchStatus } from '../../domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../domain/exceptions/match-not-found.exception';
import { ForbiddenException } from '@nestjs/common';
import { InvalidMatchTransitionException } from '../../domain/exceptions/invalid-match-transition.exception';
import type { IMatchRepository } from '../../domain/interfaces/match.repository.interface';

const mockMatch = (overrides: Partial<MatchEntity> = {}): MatchEntity =>
  new MatchEntity({
    id: 'match-1',
    clubId: 'club-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    status: MatchStatus.SCHEDULED,
    scheduledAt: new Date('2026-09-01T18:00:00Z'),
    startedAt: null,
    finishedAt: null,
    period: 0,
    gameClock: '00:00',
    totalPeriods: 4,
    periodDurationMinutes: 10,
    suspensionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('Match Use Cases', () => {
  let repository: jest.Mocked<IMatchRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('CreateMatchUseCase', () => {
    it('should create a match in SCHEDULED state', async () => {
      const useCase = new CreateMatchUseCase(repository);
      const created = mockMatch();
      repository.create.mockResolvedValue(created);

      const result = await useCase.execute({
        clubId: 'club-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        scheduledAt: '2026-09-01T18:00:00Z',
      });

      expect(result).toEqual(created);
      expect(repository.create).toHaveBeenCalledWith({
        clubId: 'club-1',
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        scheduledAt: expect.any(Date),
      });
    });
  });

  describe('GetMatchUseCase', () => {
    it('should return a match by id', async () => {
      const useCase = new GetMatchUseCase(repository);
      const match = mockMatch();
      repository.findById.mockResolvedValue(match);

      const result = await useCase.execute('match-1');
      expect(result).toEqual(match);
    });

    it('should throw MatchNotFoundException when not found', async () => {
      const useCase = new GetMatchUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        MatchNotFoundException,
      );
    });
  });

  describe('ListMatchesUseCase', () => {
    it('should return paginated matches', async () => {
      const useCase = new ListMatchesUseCase(repository);
      const matches = [mockMatch()];
      repository.findMany.mockResolvedValue(matches);
      repository.count.mockResolvedValue(1);

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        clubId: 'club-1',
      });

      expect(result.data).toEqual(matches);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('StartMatchUseCase', () => {
    it('should transition SCHEDULED -> ONGOING', async () => {
      const useCase = new StartMatchUseCase(repository);
      const scheduled = mockMatch({ status: MatchStatus.SCHEDULED });
      const ongoing = mockMatch({ status: MatchStatus.ONGOING, period: 1 });
      repository.findById.mockResolvedValue(scheduled);
      repository.update.mockResolvedValue(ongoing);

      const result = await useCase.execute('match-1');
      expect(result.status).toBe(MatchStatus.ONGOING);
      expect(repository.update).toHaveBeenCalledWith('match-1', {
        status: MatchStatus.ONGOING,
        startedAt: expect.any(Date),
        period: 1,
      });
    });

    it('should throw when match is already ONGOING', async () => {
      const useCase = new StartMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.ONGOING }),
      );

      await expect(useCase.execute('match-1')).rejects.toThrow(
        InvalidMatchTransitionException,
      );
    });

    it('should throw when match is FINISHED', async () => {
      const useCase = new StartMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.FINISHED }),
      );

      await expect(useCase.execute('match-1')).rejects.toThrow(
        InvalidMatchTransitionException,
      );
    });

    it('should throw MatchNotFoundException when not found', async () => {
      const useCase = new StartMatchUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        MatchNotFoundException,
      );
    });
  });

  describe('FinishMatchUseCase', () => {
    it('should transition ONGOING -> FINISHED', async () => {
      const useCase = new FinishMatchUseCase(repository);
      const ongoing = mockMatch({ status: MatchStatus.ONGOING });
      const finished = mockMatch({ status: MatchStatus.FINISHED });
      repository.findById.mockResolvedValue(ongoing);
      repository.update.mockResolvedValue(finished);

      const result = await useCase.execute('match-1');
      expect(result.status).toBe(MatchStatus.FINISHED);
      expect(repository.update).toHaveBeenCalledWith('match-1', {
        status: MatchStatus.FINISHED,
        finishedAt: expect.any(Date),
      });
    });

    it('should throw when match is SCHEDULED', async () => {
      const useCase = new FinishMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.SCHEDULED }),
      );

      await expect(useCase.execute('match-1')).rejects.toThrow(
        InvalidMatchTransitionException,
      );
    });

    it('should throw when match is already FINISHED', async () => {
      const useCase = new FinishMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.FINISHED }),
      );

      await expect(useCase.execute('match-1')).rejects.toThrow(
        InvalidMatchTransitionException,
      );
    });

    it('should throw MatchNotFoundException when not found', async () => {
      const useCase = new FinishMatchUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        MatchNotFoundException,
      );
    });
  });

  describe('UpdateMatchUseCase', () => {
    it('should update a scheduled match', async () => {
      const useCase = new UpdateMatchUseCase(repository);
      const scheduled = mockMatch({ status: MatchStatus.SCHEDULED });
      const updated = mockMatch({ homeTeamId: 'team-3' });
      repository.findById.mockResolvedValue(scheduled);
      repository.update.mockResolvedValue(updated);

      const result = await useCase.execute('match-1', {
        homeTeamId: 'team-3',
        awayTeamId: 'team-4',
        scheduledAt: '2026-10-01T18:00:00Z',
      });

      expect(result).toEqual(updated);
      expect(repository.update).toHaveBeenCalledWith('match-1', {
        homeTeamId: 'team-3',
        awayTeamId: 'team-4',
        scheduledAt: expect.any(Date),
      });
    });

    it('should update only provided fields', async () => {
      const useCase = new UpdateMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.SCHEDULED }),
      );
      repository.update.mockResolvedValue(mockMatch());

      await useCase.execute('match-1', { awayTeamId: 'team-9' });
      expect(repository.update).toHaveBeenCalledWith('match-1', {
        awayTeamId: 'team-9',
      });
    });

    it('should throw when match is not SCHEDULED', async () => {
      const useCase = new UpdateMatchUseCase(repository);
      repository.findById.mockResolvedValue(
        mockMatch({ status: MatchStatus.ONGOING }),
      );

      await expect(
        useCase.execute('match-1', { homeTeamId: 'team-3' }),
      ).rejects.toThrow(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw MatchNotFoundException when not found', async () => {
      const useCase = new UpdateMatchUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('missing', { homeTeamId: 'team-3' }),
      ).rejects.toThrow(MatchNotFoundException);
    });
  });

  describe('DeleteMatchUseCase', () => {
    it('should delete an existing match', async () => {
      const useCase = new DeleteMatchUseCase(repository);
      repository.findById.mockResolvedValue(mockMatch());
      repository.delete.mockResolvedValue(undefined);

      await useCase.execute('match-1');
      expect(repository.delete).toHaveBeenCalledWith('match-1');
    });

    it('should throw MatchNotFoundException when not found', async () => {
      const useCase = new DeleteMatchUseCase(repository);
      repository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        MatchNotFoundException,
      );
    });
  });
});
