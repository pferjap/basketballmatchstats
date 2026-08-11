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

interface ApiError {
  success: boolean;
  statusCode: number;
  errors: Array<{ code: string; message: string; details: unknown }>;
  timestamp: string;
}

interface ClubResponse {
  id: string;
  name: string;
  city: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeamResponse {
  id: string;
  name: string;
  clubId: string;
  createdAt: string;
  updatedAt: string;
}

interface PlayerResponse {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: string | null;
  teamId: string;
  createdAt: string;
  updatedAt: string;
}

describe('Club → Team → Player (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  const testEmail = `e2e-ctp-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    prisma = app.get(PrismaService);

    // Register a SUPER_ADMIN to have full access for CRUD tests
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const result = await createTestUser(httpServer, prisma, {
      email: testEmail,
      firstName: 'E2E',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
    });

    accessToken = result.accessToken;
  });

  afterAll(async () => {
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app?.close();
  });

  let clubId: string;
  let teamId: string;
  let playerId: string;

  it('POST /clubs — creates a club', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'E2E Lakers', city: 'Los Angeles' })
      .expect(201);

    const body = res.body as ApiEnvelope<ClubResponse>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('E2E Lakers');
    expect(body.data.city).toBe('Los Angeles');
    clubId = body.data.id;
  });

  it('POST /teams — creates a team under the club', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'First Team', clubId })
      .expect(201);

    const body = res.body as ApiEnvelope<TeamResponse>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('First Team');
    expect(body.data.clubId).toBe(clubId);
    teamId = body.data.id;
  });

  it('POST /teams — rejects when club does not exist', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const fakeClubId = '00000000-0000-0000-0000-000000000000';

    const res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Ghost Team', clubId: fakeClubId })
      .expect(404);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe('CLUB_NOT_FOUND');
  });

  it('POST /players — creates a player under the team', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        firstName: 'LeBron',
        lastName: 'James',
        jerseyNumber: 23,
        position: 'SMALL_FORWARD',
        teamId,
      })
      .expect(201);

    const body = res.body as ApiEnvelope<PlayerResponse>;
    expect(body.success).toBe(true);
    expect(body.data.firstName).toBe('LeBron');
    expect(body.data.lastName).toBe('James');
    expect(body.data.jerseyNumber).toBe(23);
    expect(body.data.position).toBe('SMALL_FORWARD');
    expect(body.data.teamId).toBe(teamId);
    playerId = body.data.id;
  });

  it('POST /players — rejects when team does not exist', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];
    const fakeTeamId = '00000000-0000-0000-0000-000000000000';

    const res: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'Ghost', lastName: 'Player', teamId: fakeTeamId })
      .expect(404);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe('TEAM_NOT_FOUND');
  });

  it('GET /players — lists players with pagination meta', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .get('/players')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ teamId })
      .expect(200);

    const body = res.body as ApiEnvelope<PlayerResponse[]>;
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].id).toBe(playerId);
    expect(body.meta).toBeDefined();
    expect(body.meta!.page).toBe(1);
  });

  it('PUT /players/:id — updates a player', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .put(`/players/${playerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ jerseyNumber: 6 })
      .expect(200);

    const body = res.body as ApiEnvelope<PlayerResponse>;
    expect(body.data.jerseyNumber).toBe(6);
    expect(body.data.firstName).toBe('LeBron');
  });

  it('GET /players/:id — retrieves a single player', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .get(`/players/${playerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<PlayerResponse>;
    expect(body.data.id).toBe(playerId);
    expect(body.data.jerseyNumber).toBe(6);
  });

  it('DELETE /clubs/:id — cascade deletes teams and players', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    await request(httpServer)
      .delete(`/clubs/${clubId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const teamsRes: SupertestResponse = await request(httpServer)
      .get('/teams')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ clubId })
      .expect(200);

    const teamsBody = teamsRes.body as ApiEnvelope<TeamResponse[]>;
    expect(teamsBody.meta!.total).toBe(0);

    const playersRes: SupertestResponse = await request(httpServer)
      .get('/players')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ teamId })
      .expect(200);

    const playersBody = playersRes.body as ApiEnvelope<PlayerResponse[]>;
    expect(playersBody.meta!.total).toBe(0);
  });
});
