import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { MatchGateway } from './match.gateway';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import { MATCH_REPOSITORY } from '../../matches/domain/interfaces/match.repository.interface';
import { MatchStatus } from '../../matches/domain/enums/match-status.enum';
import { UserRole } from '../../users/domain/enums/user-role.enum';
import type { JwtPayload } from '../../auth/infrastructure/strategies/jwt.strategy';

describe('MatchGateway', () => {
  let gateway: MatchGateway;
  let jwtService: jest.Mocked<JwtService>;
  let matchRepository: { findById: jest.Mock };

  const mockPayload: JwtPayload = {
    sub: 'user-id-1',
    email: 'test@example.com',
    role: UserRole.CLUB_ADMIN,
    clubId: 'club-id-1',
  };

  const mockMatch = {
    id: 'match-id-1',
    clubId: 'club-id-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    status: MatchStatus.ONGOING,
    scheduledAt: new Date(),
    startedAt: new Date(),
    finishedAt: null,
    period: 1,
    gameClock: '10:00',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    matchRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchGateway,
        WsJwtGuard,
        {
          provide: JwtService,
          useValue: {
            verify: jest.fn().mockReturnValue(mockPayload),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: MATCH_REPOSITORY,
          useValue: matchRepository,
        },
      ],
    }).compile();

    gateway = module.get<MatchGateway>(MatchGateway);
    jwtService = module.get<JwtService>(JwtService) as jest.Mocked<JwtService>;

    // Mock the server
    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      in: jest.fn().mockReturnValue({
        fetchSockets: jest.fn().mockResolvedValue([]),
      }),
    } as unknown as typeof gateway.server;
  });

  describe('handleConnection', () => {
    function createMockClient(token?: string): Socket {
      return {
        id: 'client-1',
        handshake: {
          auth: token ? { token } : {},
          headers: {},
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;
    }

    it('should authenticate client with valid token', () => {
      const client = createMockClient('valid-token');

      gateway.handleConnection(client);

      expect((client.data as { user: unknown }).user).toEqual(mockPayload);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client with no token', () => {
      const client = createMockClient();

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Authentication required',
      });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect client with invalid token', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });
      const client = createMockClient('invalid-token');

      gateway.handleConnection(client);

      expect(client.emit).toHaveBeenCalledWith('error', {
        message: 'Invalid or expired token',
      });
      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should extract token from Authorization header', () => {
      const client = {
        id: 'client-2',
        handshake: {
          auth: {},
          headers: { authorization: 'Bearer header-token' },
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('header-token', {
        secret: 'test-secret',
      });
      expect((client.data as { user: unknown }).user).toEqual(mockPayload);
    });
  });

  describe('handleJoinMatch', () => {
    function createAuthenticatedClient(user: JwtPayload = mockPayload): Socket {
      return {
        id: 'client-1',
        data: { user },
        join: jest.fn().mockResolvedValue(undefined),
      } as unknown as Socket;
    }

    it('should join match room when match exists and user belongs to club', async () => {
      matchRepository.findById.mockResolvedValue(mockMatch);
      const client = createAuthenticatedClient();

      const result = await gateway.handleJoinMatch(client, {
        matchId: 'match-id-1',
      });

      expect(client.join).toHaveBeenCalledWith('match:match-id-1');
      expect(result).toEqual({
        event: 'matchJoined',
        data: { success: true, matchId: 'match-id-1' },
      });
    });

    it('should allow SUPER_ADMIN to join any match room', async () => {
      matchRepository.findById.mockResolvedValue({
        ...mockMatch,
        clubId: 'other-club',
      });
      const client = createAuthenticatedClient({
        sub: 'admin-1',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
        clubId: null,
      });

      const result = await gateway.handleJoinMatch(client, {
        matchId: 'match-id-1',
      });

      expect(client.join).toHaveBeenCalledWith('match:match-id-1');
      expect(result.data.success).toBe(true);
    });

    it('should allow VIEWER to join any match room (public broadcasting)', async () => {
      matchRepository.findById.mockResolvedValue({
        ...mockMatch,
        clubId: 'other-club',
      });
      const client = createAuthenticatedClient({
        sub: 'viewer-1',
        email: 'viewer@test.com',
        role: UserRole.VIEWER,
        clubId: null,
      });

      const result = await gateway.handleJoinMatch(client, {
        matchId: 'match-id-1',
      });

      expect(client.join).toHaveBeenCalledWith('match:match-id-1');
      expect(result.data.success).toBe(true);
    });

    it('should throw WsException when match does not exist', async () => {
      matchRepository.findById.mockResolvedValue(null);
      const client = createAuthenticatedClient();

      await expect(
        gateway.handleJoinMatch(client, { matchId: 'non-existent' }),
      ).rejects.toThrow('Match non-existent not found');
    });

    it('should throw WsException when user belongs to different club', async () => {
      matchRepository.findById.mockResolvedValue({
        ...mockMatch,
        clubId: 'other-club-id',
      });
      const client = createAuthenticatedClient();

      await expect(
        gateway.handleJoinMatch(client, { matchId: 'match-id-1' }),
      ).rejects.toThrow('Access denied: match belongs to another club');
    });

    it('should throw WsException when matchId is missing', async () => {
      const client = createAuthenticatedClient();

      await expect(
        gateway.handleJoinMatch(client, { matchId: '' }),
      ).rejects.toThrow('matchId is required');
    });
  });

  describe('handleLeaveMatch', () => {
    it('should leave match room', async () => {
      const client = {
        id: 'client-1',
        data: { user: mockPayload },
        leave: jest.fn().mockResolvedValue(undefined),
      } as unknown as Socket;

      const result = await gateway.handleLeaveMatch(client, {
        matchId: 'match-id-1',
      });

      expect(client.leave).toHaveBeenCalledWith('match:match-id-1');
      expect(result).toEqual({
        event: 'matchLeft',
        data: { success: true, matchId: 'match-id-1' },
      });
    });

    it('should throw WsException when matchId is missing', async () => {
      const client = {
        id: 'client-1',
        data: { user: mockPayload },
        leave: jest.fn(),
      } as unknown as Socket;

      await expect(
        gateway.handleLeaveMatch(client, { matchId: '' }),
      ).rejects.toThrow('matchId is required');
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection without errors', () => {
      const client = { id: 'client-1' } as unknown as Socket;
      expect(() => gateway.handleDisconnect(client)).not.toThrow();
    });
  });

  describe('emitToMatch', () => {
    it('should emit event to the correct match room', () => {
      const payload = { eventType: 'POINT_2', teamId: 'team-1' };

      gateway.emitToMatch('match-123', 'event.created', payload);

      expect(gateway.server.to).toHaveBeenCalledWith('match:match-123');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        'event.created',
        payload,
      );
    });
  });

  describe('getMatchRoomSize', () => {
    it('should return 0 for empty room', async () => {
      const size = await gateway.getMatchRoomSize('non-existent');
      expect(size).toBe(0);
    });

    it('should return correct count for populated room', async () => {
      (gateway.server as unknown as { in: jest.Mock }).in = jest
        .fn()
        .mockReturnValue({
          fetchSockets: jest.fn().mockResolvedValue([{}, {}, {}]),
        });

      const size = await gateway.getMatchRoomSize('match-123');
      expect(size).toBe(3);
    });
  });
});
