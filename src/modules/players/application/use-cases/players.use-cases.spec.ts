import { ITeamRepository } from '../../../teams/domain/interfaces/team.repository.interface';
import { TeamNotFoundException } from '../../../teams/domain/exceptions/team-not-found.exception';
import { Player, PlayerPosition } from '../../domain/entities/player.entity';
import { PlayerNotFoundException } from '../../domain/exceptions/player-not-found.exception';
import { IPlayerRepository } from '../../domain/interfaces/player.repository.interface';
import { CreatePlayerUseCase } from './create-player.use-case';
import { DeletePlayerUseCase } from './delete-player.use-case';
import { GetPlayerUseCase } from './get-player.use-case';
import { ListPlayersUseCase } from './list-players.use-case';
import { UpdatePlayerUseCase } from './update-player.use-case';

const TEAM_ID = '44444444-4444-4444-4444-444444444444';

function buildPlayer(overrides: Partial<Player> = {}): Player {
  return new Player({
    id: overrides.id ?? '55555555-5555-5555-5555-555555555555',
    firstName: overrides.firstName ?? 'LeBron',
    lastName: overrides.lastName ?? 'James',
    jerseyNumber: overrides.jerseyNumber ?? 23,
    position: overrides.position ?? PlayerPosition.SMALL_FORWARD,
    teamId: overrides.teamId ?? TEAM_ID,
    createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: overrides.updatedAt ?? new Date('2026-01-02T00:00:00.000Z'),
  });
}

function buildPlayerRepository(): jest.Mocked<IPlayerRepository> {
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

describe('Players use-cases', () => {
  let playerRepository: jest.Mocked<IPlayerRepository>;
  let teamRepository: jest.Mocked<ITeamRepository>;

  beforeEach(() => {
    playerRepository = buildPlayerRepository();
    teamRepository = buildTeamRepository();
  });

  describe('CreatePlayerUseCase', () => {
    it('creates the player when the parent team exists', async () => {
      const player = buildPlayer();
      teamRepository.existsById.mockResolvedValue(true);
      playerRepository.create.mockResolvedValue(player);
      const useCase = new CreatePlayerUseCase(playerRepository, teamRepository);

      const result = await useCase.execute({
        firstName: 'LeBron',
        lastName: 'James',
        jerseyNumber: 23,
        position: PlayerPosition.SMALL_FORWARD,
        teamId: TEAM_ID,
      });

      expect(teamRepository.existsById).toHaveBeenCalledWith(TEAM_ID);
      expect(playerRepository.create).toHaveBeenCalledWith({
        firstName: 'LeBron',
        lastName: 'James',
        jerseyNumber: 23,
        position: PlayerPosition.SMALL_FORWARD,
        teamId: TEAM_ID,
      });
      expect(result).toBe(player);
    });

    it('defaults jerseyNumber and position to null when omitted', async () => {
      const player = buildPlayer({ jerseyNumber: null, position: null });
      teamRepository.existsById.mockResolvedValue(true);
      playerRepository.create.mockResolvedValue(player);
      const useCase = new CreatePlayerUseCase(playerRepository, teamRepository);

      await useCase.execute({
        firstName: 'Rookie',
        lastName: 'Player',
        teamId: TEAM_ID,
      });

      expect(playerRepository.create).toHaveBeenCalledWith({
        firstName: 'Rookie',
        lastName: 'Player',
        jerseyNumber: null,
        position: null,
        teamId: TEAM_ID,
      });
    });

    it('throws TeamNotFoundException when the parent team is missing', async () => {
      teamRepository.existsById.mockResolvedValue(false);
      const useCase = new CreatePlayerUseCase(playerRepository, teamRepository);

      await expect(
        useCase.execute({
          firstName: 'LeBron',
          lastName: 'James',
          teamId: TEAM_ID,
        }),
      ).rejects.toBeInstanceOf(TeamNotFoundException);
      expect(playerRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('GetPlayerUseCase', () => {
    it('returns the player when found', async () => {
      const player = buildPlayer();
      playerRepository.findById.mockResolvedValue(player);
      const useCase = new GetPlayerUseCase(playerRepository);

      const result = await useCase.execute(player.id);

      expect(result).toBe(player);
    });

    it('throws PlayerNotFoundException when not found', async () => {
      playerRepository.findById.mockResolvedValue(null);
      const useCase = new GetPlayerUseCase(playerRepository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        PlayerNotFoundException,
      );
    });
  });

  describe('ListPlayersUseCase', () => {
    it('computes skip and forwards the optional teamId filter', async () => {
      const players = [buildPlayer()];
      playerRepository.findMany.mockResolvedValue(players);
      playerRepository.count.mockResolvedValue(1);
      const useCase = new ListPlayersUseCase(playerRepository);

      const result = await useCase.execute(2, 5, TEAM_ID);

      expect(playerRepository.findMany).toHaveBeenCalledWith({
        skip: 5,
        take: 5,
        teamId: TEAM_ID,
      });
      expect(playerRepository.count).toHaveBeenCalledWith(TEAM_ID);
      expect(result).toEqual({ data: players, total: 1 });
    });

    it('omits teamId when not provided', async () => {
      playerRepository.findMany.mockResolvedValue([]);
      playerRepository.count.mockResolvedValue(0);
      const useCase = new ListPlayersUseCase(playerRepository);

      await useCase.execute(1, 10);

      expect(playerRepository.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        teamId: undefined,
      });
      expect(playerRepository.count).toHaveBeenCalledWith(undefined);
    });
  });

  describe('UpdatePlayerUseCase', () => {
    it('updates an existing player', async () => {
      const updated = buildPlayer({ firstName: 'King' });
      playerRepository.existsById.mockResolvedValue(true);
      playerRepository.update.mockResolvedValue(updated);
      const useCase = new UpdatePlayerUseCase(playerRepository);

      const result = await useCase.execute(updated.id, { firstName: 'King' });

      expect(playerRepository.update).toHaveBeenCalledWith(updated.id, {
        firstName: 'King',
        lastName: undefined,
        jerseyNumber: undefined,
        position: undefined,
      });
      expect(result).toBe(updated);
    });

    it('throws PlayerNotFoundException when the player is missing', async () => {
      playerRepository.existsById.mockResolvedValue(false);
      const useCase = new UpdatePlayerUseCase(playerRepository);

      await expect(
        useCase.execute('missing', { firstName: 'King' }),
      ).rejects.toBeInstanceOf(PlayerNotFoundException);
      expect(playerRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('DeletePlayerUseCase', () => {
    it('deletes an existing player', async () => {
      playerRepository.existsById.mockResolvedValue(true);
      playerRepository.delete.mockResolvedValue();
      const useCase = new DeletePlayerUseCase(playerRepository);

      await useCase.execute('id');

      expect(playerRepository.delete).toHaveBeenCalledWith('id');
    });

    it('throws PlayerNotFoundException when the player is missing', async () => {
      playerRepository.existsById.mockResolvedValue(false);
      const useCase = new DeletePlayerUseCase(playerRepository);

      await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
        PlayerNotFoundException,
      );
      expect(playerRepository.delete).not.toHaveBeenCalled();
    });
  });
});
