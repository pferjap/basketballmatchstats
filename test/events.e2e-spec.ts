import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { Response as SupertestResponse } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttpPipeline } from '../src/common/bootstrap/configure-http-pipeline';
import { PrismaService } from '../src/database/prisma.service';
import { createTestUser } from './helpers/create-test-user';

interface ApiEnvelope<T> {
  success: boolean;
  statusCode: number;
  data: T;
  meta?: { page: number; limit: number; total: number };
  timestamp: string;
}

interface MatchResponse {
  id: string;
  status: string;
}

interface EventResponse {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string | null;
  eventType: string;
  period: number;
  gameClock: string;
  coordinates: { x: number; y: number } | null;
  metadata: Record<string, unknown> | null;
  isVoided: boolean;
  createdAt: string;
}

describe('Events API (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  const suffix = Date.now();

  let clubId: string;
  let adminToken: string;
  let statisticianToken: string;
  let viewerToken: string;
  let teamHomeId: string;
  let teamAwayId: string;
  let playerId: string;
  let ongoingMatchId: string;
  let scheduledMatchId: string;
  let eventId: string;

  // Club B for tenant isolation
  let clubBId: string;
  let clubBAdminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    // Register SUPER_ADMIN
    const superAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: `event-sa-${suffix}@test.com`,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
      })
    ).accessToken;

    // Create Club A
    const clubRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Event Club A', city: 'City A' });
    clubId = (clubRes.body as ApiEnvelope<{ id: string }>).data.id;

    // Create Club B
    const clubBRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Event Club B', city: 'City B' });
    clubBId = (clubBRes.body as ApiEnvelope<{ id: string }>).data.id;

    // Register CLUB_ADMIN for Club A
    adminToken = (
      await createTestUser(httpServer, prisma, {
        email: `event-ca-${suffix}@test.com`,
        firstName: 'Admin',
        lastName: 'ClubA',
        role: 'CLUB_ADMIN',
        clubId,
      })
    ).accessToken;

    // Register STATISTICIAN for Club A
    statisticianToken = (
      await createTestUser(httpServer, prisma, {
        email: `event-stat-${suffix}@test.com`,
        firstName: 'Stat',
        lastName: 'Test',
        role: 'STATISTICIAN',
        clubId,
      })
    ).accessToken;

    // Register VIEWER for Club A
    viewerToken = (
      await createTestUser(httpServer, prisma, {
        email: `event-viewer-${suffix}@test.com`,
        firstName: 'Viewer',
        lastName: 'Test',
        clubId,
      })
    ).accessToken;

    // Register CLUB_ADMIN for Club B
    clubBAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: `event-cb-${suffix}@test.com`,
        firstName: 'Admin',
        lastName: 'ClubB',
        role: 'CLUB_ADMIN',
        clubId: clubBId,
      })
    ).accessToken;

    // Create teams
    const th: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Home Team', clubId });
    teamHomeId = (th.body as ApiEnvelope<{ id: string }>).data.id;

    const ta: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Away Team', clubId });
    teamAwayId = (ta.body as ApiEnvelope<{ id: string }>).data.id;

    // Create player in home team
    const pl: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'LeBron', lastName: 'James', teamId: teamHomeId });
    playerId = (pl.body as ApiEnvelope<{ id: string }>).data.id;

    // Create a SCHEDULED match
    const sm: SupertestResponse = await request(httpServer)
      .post('/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clubId,
        homeTeamId: teamHomeId,
        awayTeamId: teamAwayId,
        scheduledAt: '2026-11-01T18:00:00Z',
      });
    scheduledMatchId = (sm.body as ApiEnvelope<MatchResponse>).data.id;

    // Create an ONGOING match
    const om: SupertestResponse = await request(httpServer)
      .post('/matches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        clubId,
        homeTeamId: teamHomeId,
        awayTeamId: teamAwayId,
        scheduledAt: '2026-11-02T18:00:00Z',
      });
    ongoingMatchId = (om.body as ApiEnvelope<MatchResponse>).data.id;

    // Start the match
    await request(httpServer)
      .patch(`/matches/${ongoingMatchId}/start`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  afterAll(async () => {
    await prisma.event.deleteMany();
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: `${suffix}@test.com` } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /matches/:matchId/events', () => {
    it('should create an event on an ONGOING match (STATISTICIAN)', async () => {
      const res: SupertestResponse = await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${statisticianToken}`)
        .send({
          teamId: teamHomeId,
          playerId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '05:30',
          coordinates: { x: 45, y: 60 },
          metadata: { points: 2, shotType: 'layup' },
        })
        .expect(201);

      const body = res.body as ApiEnvelope<EventResponse>;
      expect(body.success).toBe(true);
      expect(body.data.matchId).toBe(ongoingMatchId);
      expect(body.data.teamId).toBe(teamHomeId);
      expect(body.data.playerId).toBe(playerId);
      expect(body.data.eventType).toBe('POINTS_MADE');
      expect(body.data.period).toBe(1);
      expect(body.data.gameClock).toBe('05:30');
      expect(body.data.coordinates).toEqual({ x: 45, y: 60 });
      expect(body.data.metadata).toEqual({ points: 2, shotType: 'layup' });
      expect(body.data.isVoided).toBe(false);
      eventId = body.data.id;
    });

    it('should create a team-level event without playerId', async () => {
      const res: SupertestResponse = await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: teamHomeId,
          eventType: 'TIMEOUT',
          period: 1,
          gameClock: '04:00',
        })
        .expect(201);

      const body = res.body as ApiEnvelope<EventResponse>;
      expect(body.data.playerId).toBeNull();
      expect(body.data.eventType).toBe('TIMEOUT');
    });

    it('should reject creating event on a SCHEDULED match (422)', async () => {
      await request(httpServer)
        .post(`/matches/${scheduledMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: teamHomeId,
          playerId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '10:00',
        })
        .expect(422);
    });

    it('should reject VIEWER creating events (403)', async () => {
      await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          teamId: teamHomeId,
          playerId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '03:00',
        })
        .expect(403);
    });

    it('should reject player-required event without playerId (422)', async () => {
      await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: teamHomeId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '02:00',
        })
        .expect(422);
    });

    it('should reject event from a team not in the match (422)', async () => {
      await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: 'a0a0a0a0-b1b1-4c2c-9d3d-e4e4e4e4e4e4',
          playerId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '01:00',
        })
        .expect(422);
    });

    it('should reject tenant isolation (Club B admin on Club A match)', async () => {
      await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .send({
          teamId: teamHomeId,
          playerId,
          eventType: 'POINTS_MADE',
          period: 1,
          gameClock: '00:30',
        })
        .expect(403);
    });
  });

  describe('GET /matches/:matchId/events', () => {
    it('should list events for a match', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<EventResponse[]>;
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach((e) => expect(e.matchId).toBe(ongoingMatchId));
    });

    it('should filter events by eventType', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get(`/matches/${ongoingMatchId}/events?eventType=TIMEOUT`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<EventResponse[]>;
      body.data.forEach((e) => expect(e.eventType).toBe('TIMEOUT'));
    });

    it('should deny Club B admin from listing Club A events', async () => {
      await request(httpServer)
        .get(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .expect(403);
    });
  });

  describe('GET /events/:id', () => {
    it('should get a single event by id', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<EventResponse>;
      expect(body.data.id).toBe(eventId);
    });

    it('should deny Club B admin from viewing Club A event', async () => {
      await request(httpServer)
        .get(`/events/${eventId}`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .expect(403);
    });
  });

  describe('PATCH /events/:id/void', () => {
    it('should void an event (soft-delete)', async () => {
      // Create an event to void
      const createRes: SupertestResponse = await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: teamAwayId,
          playerId: null,
          eventType: 'TIMEOUT',
          period: 1,
          gameClock: '09:00',
        });
      const voidTargetId = (createRes.body as ApiEnvelope<EventResponse>).data
        .id;

      const res: SupertestResponse = await request(httpServer)
        .patch(`/events/${voidTargetId}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<EventResponse>;
      expect(body.data.isVoided).toBe(true);
    });

    it('should reject voiding an already voided event (422)', async () => {
      // Create and void
      const createRes: SupertestResponse = await request(httpServer)
        .post(`/matches/${ongoingMatchId}/events`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          teamId: teamHomeId,
          eventType: 'QUARTER_START',
          period: 1,
          gameClock: '10:00',
        });
      const id = (createRes.body as ApiEnvelope<EventResponse>).data.id;

      await request(httpServer)
        .patch(`/events/${id}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(httpServer)
        .patch(`/events/${id}/void`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);
    });

    it('should reject VIEWER from voiding events (403)', async () => {
      await request(httpServer)
        .patch(`/events/${eventId}/void`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(403);
    });
  });
});
