import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { UserRole } from '../src/modules/users/domain/enums/user-role.enum';
import { AddressInfo } from 'net';
import request from 'supertest';
import { configureHttpPipeline } from '../src/common/bootstrap/configure-http-pipeline';

describe('WebSocket Gateway (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    // Listen on random port
    await app.listen(0);
    const httpServer = app.getHttpServer() as { address: () => AddressInfo };
    const address = httpServer.address();
    port = address.port;

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
  });

  function generateToken(payload: {
    sub: string;
    email: string;
    role: UserRole;
    clubId: string | null;
  }): string {
    return jwtService.sign(payload, {
      secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  function connectClient(token?: string): ClientSocket {
    return io(`http://localhost:${port}/matches`, {
      autoConnect: false,
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });
  }

  function waitForEvent(
    client: ClientSocket,
    event: string,
    timeout = 3000,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timeout waiting for '${event}'`)),
        timeout,
      );
      client.once(event, (data: unknown) => {
        clearTimeout(timer);
        resolve(data);
      });
    });
  }

  describe('Connection Authentication', () => {
    it('should accept connection with valid JWT in auth.token', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
        clubId: null,
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      client.connect();
      await connected;

      expect(client.connected).toBe(true);
      client.disconnect();
    });

    it('should reject connection with no token', async () => {
      const client = connectClient();

      const errorPromise = waitForEvent(client, 'error');
      const disconnectPromise = new Promise<void>((resolve) => {
        client.on('disconnect', () => resolve());
      });

      client.connect();

      const error = await errorPromise;
      expect(error).toEqual({ message: 'Authentication required' });
      await disconnectPromise;
      client.disconnect();
    });

    it('should reject connection with invalid token', async () => {
      const client = connectClient('totally-invalid-jwt-string');

      const errorPromise = waitForEvent(client, 'error');
      const disconnectPromise = new Promise<void>((resolve) => {
        client.on('disconnect', () => resolve());
      });

      client.connect();

      const error = await errorPromise;
      expect(error).toEqual({ message: 'Invalid or expired token' });
      await disconnectPromise;
      client.disconnect();
    });

    it('should reject connection with expired token', async () => {
      const expiredToken = jwtService.sign(
        {
          sub: 'user-1',
          email: 'admin@test.com',
          role: UserRole.SUPER_ADMIN,
          clubId: null,
        },
        {
          secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: '0s',
        },
      );

      // Small delay to ensure expiration
      await new Promise((r) => setTimeout(r, 100));

      const client = connectClient(expiredToken);
      const errorPromise = waitForEvent(client, 'error');

      client.connect();

      const error = await errorPromise;
      expect(error).toEqual({ message: 'Invalid or expired token' });
      client.disconnect();
    });

    it('should accept connection from all valid roles', async () => {
      const roles = [
        UserRole.SUPER_ADMIN,
        UserRole.CLUB_ADMIN,
        UserRole.COACH,
        UserRole.STATISTICIAN,
        UserRole.VIEWER,
      ];

      for (const role of roles) {
        const token = generateToken({
          sub: `user-${role}`,
          email: `${role.toLowerCase()}@test.com`,
          role,
          clubId: role === UserRole.SUPER_ADMIN ? null : 'club-1',
        });

        const client = connectClient(token);
        const connected = new Promise<void>((resolve) => {
          client.on('connect', () => resolve());
        });

        client.connect();
        await connected;
        expect(client.connected).toBe(true);
        client.disconnect();
      }
    });

    it('should accept connection with Bearer token in headers', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.SUPER_ADMIN,
        clubId: null,
      });

      const client = io(`http://localhost:${port}/matches`, {
        autoConnect: false,
        transports: ['websocket'],
        extraHeaders: {
          authorization: `Bearer ${token}`,
        },
      });

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });

      client.connect();
      await connected;

      expect(client.connected).toBe(true);
      client.disconnect();
    });
  });

  describe('Room Isolation (joinMatch / leaveMatch)', () => {
    let clubId: string;
    let matchId: string;
    let homeTeamId: string;
    let awayTeamId: string;

    beforeAll(async () => {
      // Create test data: club, teams, match
      const club = await prisma.club.create({
        data: { name: 'WS Test Club', city: 'Test City' },
      });
      clubId = club.id;

      const homeTeam = await prisma.team.create({
        data: { name: 'WS Home', clubId },
      });
      homeTeamId = homeTeam.id;

      const awayTeam = await prisma.team.create({
        data: { name: 'WS Away', clubId },
      });
      awayTeamId = awayTeam.id;

      const match = await prisma.match.create({
        data: {
          clubId,
          homeTeamId,
          awayTeamId,
          status: 'ONGOING',
          scheduledAt: new Date(),
          startedAt: new Date(),
          period: 1,
        },
      });
      matchId = match.id;
    });

    afterAll(async () => {
      await prisma.event.deleteMany({ where: { matchId } });
      await prisma.match.deleteMany({ where: { clubId } });
      await prisma.team.deleteMany({ where: { clubId } });
      await prisma.club.delete({ where: { id: clubId } });
    });

    it('should join a match room successfully', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId,
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      const responsePromise = waitForEvent(client, 'matchJoined');
      client.emit('joinMatch', { matchId });

      const response = (await responsePromise) as {
        success: boolean;
        matchId: string;
      };
      expect(response.success).toBe(true);
      expect(response.matchId).toBe(matchId);
      client.disconnect();
    });

    it('should reject join for non-existent match', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId,
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      const errorPromise = waitForEvent(client, 'exception');
      client.emit('joinMatch', {
        matchId: '00000000-0000-4000-a000-000000000099',
      });

      const error = (await errorPromise) as { message: string };
      expect(error.message).toContain('not found');
      client.disconnect();
    });

    it('should reject join when user belongs to different club', async () => {
      const token = generateToken({
        sub: 'user-other',
        email: 'other@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId: '00000000-0000-4000-a000-000000000088',
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      const errorPromise = waitForEvent(client, 'exception');
      client.emit('joinMatch', { matchId });

      const error = (await errorPromise) as { message: string };
      expect(error.message).toContain('Access denied');
      client.disconnect();
    });

    it('should allow SUPER_ADMIN to join any match room', async () => {
      const token = generateToken({
        sub: 'super-admin-1',
        email: 'superadmin@test.com',
        role: UserRole.SUPER_ADMIN,
        clubId: null,
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      const responsePromise = waitForEvent(client, 'matchJoined');
      client.emit('joinMatch', { matchId });

      const response = (await responsePromise) as {
        success: boolean;
        matchId: string;
      };
      expect(response.success).toBe(true);
      client.disconnect();
    });

    it('should leave a match room successfully', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId,
      });
      const client = connectClient(token);

      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      // Join first
      const joinPromise = waitForEvent(client, 'matchJoined');
      client.emit('joinMatch', { matchId });
      await joinPromise;

      // Then leave
      const leavePromise = waitForEvent(client, 'matchLeft');
      client.emit('leaveMatch', { matchId });

      const response = (await leavePromise) as {
        success: boolean;
        matchId: string;
      };
      expect(response.success).toBe(true);
      expect(response.matchId).toBe(matchId);
      client.disconnect();
    });

    it('should broadcast event.created to room members when event is created via HTTP', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId,
      });

      // Client A joins the match room
      const clientA = connectClient(token);
      const connectedA = new Promise<void>((resolve) => {
        clientA.on('connect', () => resolve());
      });
      clientA.connect();
      await connectedA;

      const joinPromise = waitForEvent(clientA, 'matchJoined');
      clientA.emit('joinMatch', { matchId });
      await joinPromise;

      // Client B does NOT join the room
      const clientB = connectClient(token);
      const connectedB = new Promise<void>((resolve) => {
        clientB.on('connect', () => resolve());
      });
      clientB.connect();
      await connectedB;

      // Set up listeners BEFORE creating the event
      const eventCreatedPromise = waitForEvent(clientA, 'event.created', 5000);
      let receivedByB = false;
      clientB.on('event.created', () => {
        receivedByB = true;
      });

      // Create event via HTTP POST
      await request(app.getHttpServer())
        .post(`/matches/${matchId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          teamId: homeTeamId,
          eventType: 'TIMEOUT',
          period: 1,
          gameClock: '08:00',
        })
        .expect(201);

      // Client A (in room) should receive the broadcast
      const broadcastedEvent = (await eventCreatedPromise) as {
        id: string;
        matchId: string;
        eventType: string;
      };
      expect(broadcastedEvent.matchId).toBe(matchId);
      expect(broadcastedEvent.eventType).toBe('TIMEOUT');
      expect(broadcastedEvent.id).toBeDefined();

      // Wait briefly and verify Client B (not in room) did NOT receive it
      await new Promise((r) => setTimeout(r, 200));
      expect(receivedByB).toBe(false);

      clientA.disconnect();
      clientB.disconnect();
    });

    it('should broadcast event.voided when event is voided via HTTP', async () => {
      const token = generateToken({
        sub: 'user-1',
        email: 'admin@test.com',
        role: UserRole.CLUB_ADMIN,
        clubId,
      });

      // Create an event first
      const createRes = await request(app.getHttpServer())
        .post(`/matches/${matchId}/events`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          teamId: homeTeamId,
          eventType: 'TIMEOUT',
          period: 1,
          gameClock: '07:00',
        })
        .expect(201);

      const eventId = (createRes.body as { data: { id: string } }).data.id;

      // Connect WS client and join room
      const client = connectClient(token);
      const connected = new Promise<void>((resolve) => {
        client.on('connect', () => resolve());
      });
      client.connect();
      await connected;

      const joinP = waitForEvent(client, 'matchJoined');
      client.emit('joinMatch', { matchId });
      await joinP;

      // Listen for voided event
      const voidedPromise = waitForEvent(client, 'event.voided', 5000);

      // Void the event via HTTP
      await request(app.getHttpServer())
        .patch(`/events/${eventId}/void`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const voidedPayload = (await voidedPromise) as {
        eventId: string;
        matchId: string;
      };
      expect(voidedPayload.eventId).toBe(eventId);
      expect(voidedPayload.matchId).toBe(matchId);

      client.disconnect();
    });
  });
});
