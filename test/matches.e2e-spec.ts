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
  clubId: string;
  homeTeamId: string;
  awayTeamId: string;
  status: string;
  scheduledAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  period: number;
  gameClock: string;
  totalPeriods: number;
  periodDurationMinutes: number;
  suspensionReason: string | null;
}

describe('Matches (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  const suffix = Date.now();

  let clubAId: string;
  let clubAAdminToken: string;
  let teamA1Id: string;
  let teamA2Id: string;

  let clubBId: string;
  let clubBAdminToken: string;

  let superAdminToken: string;
  let matchId: string;

  const superAdminEmail = `match-sa-${suffix}@test.com`;
  const clubAAdminEmail = `match-ca-${suffix}@test.com`;
  const clubBAdminEmail = `match-cb-${suffix}@test.com`;

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
    superAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: superAdminEmail,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
      })
    ).accessToken;

    // Create Club A
    const clubARes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Match Club A', city: 'City A' });
    clubAId = (clubARes.body as ApiEnvelope<{ id: string }>).data.id;

    // Create Club B
    const clubBRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Match Club B', city: 'City B' });
    clubBId = (clubBRes.body as ApiEnvelope<{ id: string }>).data.id;

    // Register CLUB_ADMIN for Club A
    clubAAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: clubAAdminEmail,
        firstName: 'Admin',
        lastName: 'ClubA',
        role: 'CLUB_ADMIN',
        clubId: clubAId,
      })
    ).accessToken;

    // Register CLUB_ADMIN for Club B
    clubBAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: clubBAdminEmail,
        firstName: 'Admin',
        lastName: 'ClubB',
        role: 'CLUB_ADMIN',
        clubId: clubBId,
      })
    ).accessToken;

    // Create two teams for Club A
    const team1Res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ name: 'Team A1', clubId: clubAId });
    teamA1Id = (team1Res.body as ApiEnvelope<{ id: string }>).data.id;

    const team2Res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ name: 'Team A2', clubId: clubAId });
    teamA2Id = (team2Res.body as ApiEnvelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /matches', () => {
    it('should create a match (CLUB_ADMIN)', async () => {
      const res: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-01T18:00:00Z',
        })
        .expect(201);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('SCHEDULED');
      expect(body.data.clubId).toBe(clubAId);
      expect(body.data.homeTeamId).toBe(teamA1Id);
      expect(body.data.awayTeamId).toBe(teamA2Id);
      expect(body.data.period).toBe(0);
      expect(body.data.totalPeriods).toBe(4);
      expect(body.data.periodDurationMinutes).toBe(10);
      matchId = body.data.id;
    });

    it('should create a match with custom quarter configuration', async () => {
      const res: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-01T20:00:00Z',
          totalPeriods: 2,
          periodDurationMinutes: 20,
        })
        .expect(201);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.totalPeriods).toBe(2);
      expect(body.data.periodDurationMinutes).toBe(20);
    });

    it('should reject invalid quarter configuration', async () => {
      await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-01T21:00:00Z',
          totalPeriods: 99,
        })
        .expect(400);
    });

    it('should reject VIEWER creating a match', async () => {
      await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-02T18:00:00Z',
        });

      // Register a VIEWER
      const viewerToken = (
        await createTestUser(httpServer, prisma, {
          email: `match-viewer-${suffix}@test.com`,
          firstName: 'Viewer',
          lastName: 'Test',
        })
      ).accessToken;

      await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-03T18:00:00Z',
        })
        .expect(403);
    });

    it('should reject creating match in another club', async () => {
      await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-10-04T18:00:00Z',
        })
        .expect(403);
    });
  });

  describe('GET /matches', () => {
    it('should list matches for own club', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse[]>;
      expect(body.success).toBe(true);
      expect(body.data.length).toBeGreaterThan(0);
      body.data.forEach((m) => expect(m.clubId).toBe(clubAId));
    });

    it('should not list another clubs matches', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get('/matches')
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse[]>;
      body.data.forEach((m) => expect(m.clubId).not.toBe(clubAId));
    });

    it('should return an empty list for a user without a club', async () => {
      const clublessCoach = await createTestUser(httpServer, prisma, {
        email: `match-coach-noclub-${suffix}@test.com`,
        firstName: 'Coach',
        lastName: 'NoClub',
        role: 'COACH',
      });

      const res: SupertestResponse = await request(httpServer)
        .get('/matches')
        .set('Authorization', `Bearer ${clublessCoach.accessToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse[]>;
      expect(body.success).toBe(true);
      expect(body.data).toHaveLength(0);
      expect(body.meta?.total).toBe(0);
    });
  });

  describe('GET /matches/:id', () => {
    it('should get match by id (own club)', async () => {
      const res: SupertestResponse = await request(httpServer)
        .get(`/matches/${matchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.id).toBe(matchId);
    });

    it('should allow reading another clubs match by id (spectator access)', async () => {
      // GET /matches/:id is intentionally not tenant-checked so viewers (who
      // may belong to no club) can spectate any match. Write operations remain
      // tenant-isolated (see PUT/start/finish/DELETE tests).
      const res: SupertestResponse = await request(httpServer)
        .get(`/matches/${matchId}`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.id).toBe(matchId);
    });
  });

  describe('PUT /matches/:id', () => {
    it('should deny another clubs admin from editing', async () => {
      await request(httpServer)
        .put(`/matches/${matchId}`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .send({ scheduledAt: '2026-12-01T18:00:00Z' })
        .expect(403);
    });

    it('should update scheduling details (CLUB_ADMIN)', async () => {
      const res: SupertestResponse = await request(httpServer)
        .put(`/matches/${matchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          homeTeamId: teamA2Id,
          awayTeamId: teamA1Id,
          scheduledAt: '2026-12-15T20:30:00Z',
        })
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.homeTeamId).toBe(teamA2Id);
      expect(body.data.awayTeamId).toBe(teamA1Id);
      expect(body.data.scheduledAt).toBe('2026-12-15T20:30:00.000Z');
      expect(body.data.status).toBe('SCHEDULED');
    });

    it('should reject editing a non-SCHEDULED match', async () => {
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-11-05T18:00:00Z',
        });
      const ongoingMatchId = (createRes.body as ApiEnvelope<MatchResponse>).data
        .id;

      await request(httpServer)
        .patch(`/matches/${ongoingMatchId}/start`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      await request(httpServer)
        .put(`/matches/${ongoingMatchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({ scheduledAt: '2026-12-20T18:00:00Z' })
        .expect(403);
    });
  });

  describe('PATCH /matches/:id/start', () => {
    it('should start a SCHEDULED match', async () => {
      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.status).toBe('ONGOING');
      expect(body.data.period).toBe(1);
      expect(body.data.startedAt).not.toBeNull();
    });

    it('should reject starting an already ONGOING match', async () => {
      await request(httpServer)
        .patch(`/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(409);
    });

    it('should deny another clubs admin from starting', async () => {
      // Create another match first for this test
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-11-01T18:00:00Z',
        });
      const newMatchId = (createRes.body as ApiEnvelope<MatchResponse>).data.id;

      await request(httpServer)
        .patch(`/matches/${newMatchId}/start`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .expect(403);
    });
  });

  describe('PATCH /matches/:id/finish', () => {
    it('should finish an ONGOING match', async () => {
      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${matchId}/finish`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.status).toBe('FINISHED');
      expect(body.data.finishedAt).not.toBeNull();
    });

    it('should reject finishing a FINISHED match', async () => {
      await request(httpServer)
        .patch(`/matches/${matchId}/finish`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(409);
    });

    it('should reject finishing a SCHEDULED match', async () => {
      // Create a new SCHEDULED match
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-12-01T18:00:00Z',
        });
      const newMatchId = (createRes.body as ApiEnvelope<MatchResponse>).data.id;

      await request(httpServer)
        .patch(`/matches/${newMatchId}/finish`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(409);
    });
  });

  describe('Lifecycle: cancel / postpone / suspend', () => {
    async function createScheduledMatch(
      scheduledAt: string,
    ): Promise<string> {
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt,
        });
      return (createRes.body as ApiEnvelope<MatchResponse>).data.id;
    }

    async function startMatch(id: string): Promise<void> {
      await request(httpServer)
        .patch(`/matches/${id}/start`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);
    }

    it('should cancel an ONGOING match (SUPER_ADMIN)', async () => {
      const id = await createScheduledMatch('2027-01-01T18:00:00Z');
      await startMatch(id);

      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${id}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.status).toBe('CANCELLED');
    });

    it('should cancel a SCHEDULED match (SUPER_ADMIN)', async () => {
      const id = await createScheduledMatch('2027-01-02T18:00:00Z');

      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${id}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect((res.body as ApiEnvelope<MatchResponse>).data.status).toBe(
        'CANCELLED',
      );
    });

    it('should deny CLUB_ADMIN from cancelling', async () => {
      const id = await createScheduledMatch('2027-01-03T18:00:00Z');

      await request(httpServer)
        .patch(`/matches/${id}/cancel`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(403);
    });

    it('should postpone a match with a new schedule (SUPER_ADMIN)', async () => {
      const id = await createScheduledMatch('2027-02-01T18:00:00Z');

      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${id}/postpone`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ scheduledAt: '2027-03-01T18:00:00Z' })
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.status).toBe('POSTPONED');
      expect(body.data.scheduledAt).toBe('2027-03-01T18:00:00.000Z');
    });

    it('should suspend an ONGOING match with a reason (annotator)', async () => {
      const id = await createScheduledMatch('2027-04-01T18:00:00Z');
      await startMatch(id);

      const res: SupertestResponse = await request(httpServer)
        .patch(`/matches/${id}/suspend`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({ reason: 'Lluvia intensa' })
        .expect(200);

      const body = res.body as ApiEnvelope<MatchResponse>;
      expect(body.data.status).toBe('SUSPENDED');
      expect(body.data.suspensionReason).toBe('Lluvia intensa');
    });

    it('should reject suspending without a reason', async () => {
      const id = await createScheduledMatch('2027-04-02T18:00:00Z');
      await startMatch(id);

      await request(httpServer)
        .patch(`/matches/${id}/suspend`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({})
        .expect(400);
    });

    it('should reject suspending a SCHEDULED match', async () => {
      const id = await createScheduledMatch('2027-04-03T18:00:00Z');

      await request(httpServer)
        .patch(`/matches/${id}/suspend`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({ reason: 'No procede' })
        .expect(409);
    });

    it('should deny another clubs admin from suspending', async () => {
      const id = await createScheduledMatch('2027-04-04T18:00:00Z');
      await startMatch(id);

      await request(httpServer)
        .patch(`/matches/${id}/suspend`)
        .set('Authorization', `Bearer ${clubBAdminToken}`)
        .send({ reason: 'Cross-club' })
        .expect(403);
    });
  });

  describe('DELETE /matches/:id', () => {
    it('should delete a SCHEDULED match', async () => {
      // Create a new match to delete
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-12-15T18:00:00Z',
        });
      const deleteMatchId = (createRes.body as ApiEnvelope<MatchResponse>).data
        .id;

      await request(httpServer)
        .delete(`/matches/${deleteMatchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(200);

      // Verify it's gone
      await request(httpServer)
        .get(`/matches/${deleteMatchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(404);
    });

    it('should reject deleting an ONGOING match', async () => {
      // Create and start a match
      const createRes: SupertestResponse = await request(httpServer)
        .post('/matches')
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .send({
          clubId: clubAId,
          homeTeamId: teamA1Id,
          awayTeamId: teamA2Id,
          scheduledAt: '2026-12-20T18:00:00Z',
        });
      const ongoingMatchId = (createRes.body as ApiEnvelope<MatchResponse>).data
        .id;

      await request(httpServer)
        .patch(`/matches/${ongoingMatchId}/start`)
        .set('Authorization', `Bearer ${clubAAdminToken}`);

      await request(httpServer)
        .delete(`/matches/${ongoingMatchId}`)
        .set('Authorization', `Bearer ${clubAAdminToken}`)
        .expect(403);
    });
  });
});
