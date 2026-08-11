import { IClubRepository } from '../../../clubs/domain/interfaces/club.repository.interface';
import { ClubNotFoundException } from '../../../clubs/domain/exceptions/club-not-found.exception';
import { Team } from '../../domain/entities/team.entity';
import { TeamNotFoundException } from '../../domain/exceptions/team-not-found.exception';
import { ITeamRepository } from '../../domain/interfaces/team.repository.interface';
import { CreateTeamUseCase } from './create-team.use-case';
import { DeleteTeamUseCase } from './delete-team.use-case';
import { GetTeamUseCase } from './get-team.use-case';
import { ListTeamsUseCase } from './list-teams.use-case';
import { UpdateTeamUseCase } from './update-team.use-case';

const CLUB_ID = '22222222-2222-2222-2222-222222222222';

function buildTeam(overrides: Partial<Team> = {}): Team {
  return new Team({
    id: overrides.id ?? '33333333-3333-3333-3333-333333333333',
    name: overrides.name ?? 'First Team',
    clubId: overrides.clubId ?? CLUB_ID,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-02T00:00:00.000Z'),
  });
}

function buildTeamRepository(): jest.Mocked<ITeamRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsById: jest.fn(),
  };
}

function buildClubRepository(): jest.Mocked<IClubRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    existsById: jest.fn(),
  };
}

describe('Teams use-cases', () => {
  let teamRepository: jest.Mocked<ITeamRepository>;
  let clubRepository: jest.Mocked<IClubRepository>;

  beforeEach(() => {
    teamRepository = buildTeamRepository();
    clubRepository = buildClubRepository();
  });

  describe('CreateTeamUseCase', () => {
    it('creates the team when the parent club exists', async () => {
      const team = buildTeam();
      clubRepository.existsById.mockResolvedValue(true);
      teamRepository.create.mockResolvedValue(team);
      const useCase = new CreateTeamUseCase(teamRepository, clubRepository);

      const result = await useCase.execute({
        name: 'First Team',
        clubId: CLUB_ID,
      });

      expect(clubRepository.existsById).toHaveBeenCalledWith(CLUB_ID);
      expect(teamRepository.create).toHaveBeenCalledWith({
        name: 'First Team',
        clubId: CLUB_ID,
      });
      expect(result).toBe(team);
    });

    it('throws ClubNotFoundException when the parent club is missing', async () => {
      clubRepository.existsById.mockResolvedValue(false);
      const useCase = new CreateTeamUseCase(teamRepository, clubRepository);

      await expect(
        useCase.execute({ name: 'First Team', clubId: CLUB_ID }),
      ).rejects.toBeInstanceOf(ClubNotFoundException);
      expect(teamRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('GetTeamUseCase', () => {
    it('throws TeamNotFoundException when it does not exist', async () => {
      teamRepository.findById.mockResolvedValue(null);
      const useCase = new GetTeamUseCase(teamRepository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        TeamNotFoundException,
      );
    });
  });

  describe('ListTeamsUseCase', () => {
    it('forwards the optional clubId filter to the repository', async () => {
      const teams = [buildTeam()];
      teamRepository.findMany.mockResolvedValue(teams);
      teamRepository.count.mockResolvedValue(1);
      const useCase = new ListTeamsUseCase(teamRepository);

      const result = await useCase.execute(1, 10, CLUB_ID);

      expect(teamRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        clubId: CLUB_ID,
      });
      expect(teamRepository.count).toHaveBeenCalledWith(CLUB_ID);
      expect(result).toEqual({ data: teams, total: 1 });
    });
  });

  describe('UpdateTeamUseCase', () => {
    it('throws TeamNotFoundException when the team is missing', async () => {
      teamRepository.existsById.mockResolvedValue(false);
      const useCase = new UpdateTeamUseCase(teamRepository);

      await expect(
        useCase.execute('missing', { name: 'Reserves' }),
      ).rejects.toBeInstanceOf(TeamNotFoundException);
      expect(teamRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('DeleteTeamUseCase', () => {
    it('deletes an existing team', async () => {
      teamRepository.existsById.mockResolvedValue(true);
      teamRepository.delete.mockResolvedValue();
      const useCase = new DeleteTeamUseCase(teamRepository);

      await useCase.execute('id');

      expect(teamRepository.delete).toHaveBeenCalledWith('id');
    });
  });
});
