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
  timestamp: string;
}

interface ApiError {
  success: boolean;
  statusCode: number;
  errors: Array<{ code: string; message: string; details: unknown }>;
  timestamp: string;
}

describe('RBAC (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  const suffix = Date.now();
  const superAdminEmail = `rbac-superadmin-${suffix}@test.com`;
  const clubAdminEmail = `rbac-clubadmin-${suffix}@test.com`;
  const coachEmail = `rbac-coach-${suffix}@test.com`;
  const viewerEmail = `rbac-viewer-${suffix}@test.com`;

  let superAdminToken: string;
  let clubAdminToken: string;
  let coachToken: string;
  let viewerToken: string;
  let rbacClubId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    // Register users with different roles
    superAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: superAdminEmail,
        role: 'SUPER_ADMIN',
      })
    ).accessToken;

    // Create a club for CLUB_ADMIN and COACH to belong to
    const clubRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'RBAC Test Club' });
    rbacClubId = (clubRes.body as ApiEnvelope<{ id: string }>).data.id;

    clubAdminToken = (
      await createTestUser(httpServer, prisma, {
        email: clubAdminEmail,
        role: 'CLUB_ADMIN',
        clubId: rbacClubId,
      })
    ).accessToken;
    coachToken = (
      await createTestUser(httpServer, prisma, {
        email: coachEmail,
        role: 'COACH',
        clubId: rbacClubId,
      })
    ).accessToken;
    viewerToken = (
      await createTestUser(httpServer, prisma, {
        email: viewerEmail,
      })
    ).accessToken; // defaults to VIEWER
  });

  afterAll(async () => {
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [superAdminEmail, clubAdminEmail, coachEmail, viewerEmail],
        },
      },
    });
    await app?.close();
  });

  // ─── Auth endpoints remain public ───────────────────────────

  it('Auth endpoints should be accessible without a token', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrong12345' });

    // Should get 401 (invalid credentials), NOT 401 from JWT guard
    const body = res.body as ApiError;
    expect(body.statusCode).toBe(401);
    expect(body.errors[0].code).toBe('INVALID_CREDENTIALS');
  });

  // ─── Unauthenticated requests ───────────────────────────────

  it('GET /clubs — should return 401 without token', async () => {
    await request(httpServer).get('/clubs').expect(401);
  });

  it('POST /clubs — should return 401 without token', async () => {
    await request(httpServer)
      .post('/clubs')
      .send({ name: 'Unauth Club' })
      .expect(401);
  });

  // ─── Clubs: write restricted to SUPER_ADMIN ─────────────────

  it('SUPER_ADMIN can POST /clubs', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'RBAC Test Club', city: 'Madrid' })
      .expect(201);

    const body = res.body as ApiEnvelope<{ id: string; name: string }>;
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('RBAC Test Club');
  });

  it('CLUB_ADMIN cannot POST /clubs (403)', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${clubAdminToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
  });

  it('VIEWER cannot POST /clubs (403)', async () => {
    await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Should Fail' })
      .expect(403);
  });

  // ─── All authenticated users can read ───────────────────────

  it('VIEWER can GET /clubs', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/clubs')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<unknown[]>;
    expect(body.success).toBe(true);
  });

  it('COACH can GET /clubs', async () => {
    await request(httpServer)
      .get('/clubs')
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(200);
  });

  // ─── Teams: write restricted to SUPER_ADMIN + CLUB_ADMIN ───

  it('CLUB_ADMIN can POST /teams', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubAdminToken}`)
      .send({ name: 'Admin Team', clubId: rbacClubId })
      .expect(201);

    const body = res.body as ApiEnvelope<{ name: string }>;
    expect(body.data.name).toBe('Admin Team');
  });

  it('COACH cannot POST /teams (403)', async () => {
    await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ name: 'Coach Team', clubId: rbacClubId })
      .expect(403);
  });

  it('VIEWER cannot POST /teams (403)', async () => {
    await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Viewer Team', clubId: rbacClubId })
      .expect(403);
  });

  // ─── Players: write restricted to SUPER_ADMIN, CLUB_ADMIN, COACH ───

  let testTeamId: string;

  it('setup: SUPER_ADMIN creates a team for player tests', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Player Test Team', clubId: rbacClubId })
      .expect(201);

    testTeamId = (res.body as ApiEnvelope<{ id: string }>).data.id;
  });

  it('COACH can POST /players', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${coachToken}`)
      .send({
        firstName: 'Coach',
        lastName: 'Player',
        teamId: testTeamId,
      })
      .expect(201);

    const body = res.body as ApiEnvelope<{ firstName: string }>;
    expect(body.data.firstName).toBe('Coach');
  });

  it('VIEWER cannot POST /players (403)', async () => {
    await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        firstName: 'Viewer',
        lastName: 'Player',
        teamId: testTeamId,
      })
      .expect(403);
  });

  it('VIEWER can GET /players', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/players')
      .set('Authorization', `Bearer ${viewerToken}`)
      .query({ teamId: testTeamId })
      .expect(200);

    const body = res.body as ApiEnvelope<unknown[]>;
    expect(body.success).toBe(true);
  });

  // ─── SUPER_ADMIN bypasses all role restrictions ─────────────

  it('SUPER_ADMIN can do everything (teams write)', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'SA Team', clubId: rbacClubId })
      .expect(201);

    const body = res.body as ApiEnvelope<{ name: string }>;
    expect(body.data.name).toBe('SA Team');
  });

  it('SUPER_ADMIN can do everything (players write)', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        firstName: 'SA',
        lastName: 'Player',
        teamId: testTeamId,
      })
      .expect(201);

    const body = res.body as ApiEnvelope<{ firstName: string }>;
    expect(body.data.firstName).toBe('SA');
  });
});
