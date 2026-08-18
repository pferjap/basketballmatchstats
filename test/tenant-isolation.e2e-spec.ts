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

describe('Tenant Isolation (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  const suffix = Date.now();

  // Club A setup
  let clubAId: string;
  let clubAAdminToken: string;
  let clubATeamId: string;
  let clubAPlayerId: string;
  const clubAAdminEmail = `tenant-clubA-admin-${suffix}@test.com`;

  // Club B setup
  let clubBId: string;
  let clubBAdminToken: string;
  let clubBTeamId: string;
  let clubBPlayerId: string;
  const clubBAdminEmail = `tenant-clubB-admin-${suffix}@test.com`;

  // SUPER_ADMIN for setup
  let superAdminToken: string;
  const superAdminEmail = `tenant-superadmin-${suffix}@test.com`;

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

    // Create Club A and Club B
    const clubARes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Club A', city: 'City A' });
    clubAId = (clubARes.body as ApiEnvelope<{ id: string }>).data.id;

    const clubBRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Club B', city: 'City B' });
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

    // Create teams and players for each club
    const teamARes: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ name: 'Team A1', clubId: clubAId });
    clubATeamId = (teamARes.body as ApiEnvelope<{ id: string }>).data.id;

    const teamBRes: SupertestResponse = await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .send({ name: 'Team B1', clubId: clubBId });
    clubBTeamId = (teamBRes.body as ApiEnvelope<{ id: string }>).data.id;

    const playerARes: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ firstName: 'Player', lastName: 'A', teamId: clubATeamId });
    clubAPlayerId = (playerARes.body as ApiEnvelope<{ id: string }>).data.id;

    const playerBRes: SupertestResponse = await request(httpServer)
      .post('/players')
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .send({ firstName: 'Player', lastName: 'B', teamId: clubBTeamId });
    clubBPlayerId = (playerBRes.body as ApiEnvelope<{ id: string }>).data.id;
  });

  afterAll(async () => {
    await prisma.match.deleteMany();
    await prisma.player.deleteMany();
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [superAdminEmail, clubAAdminEmail, clubBAdminEmail],
        },
      },
    });
    await app?.close();
  });

  // ─── Cross-tenant write access blocked ─────────────────────

  it('Club A admin cannot create a team in Club B', async () => {
    await request(httpServer)
      .post('/teams')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ name: 'Cross-tenant Team', clubId: clubBId })
      .expect(403);
  });

  it('Club A admin cannot update a team belonging to Club B', async () => {
    await request(httpServer)
      .put(`/teams/${clubBTeamId}`)
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .send({ name: 'Hacked Name' })
      .expect(403);
  });

  it('Club A admin cannot delete a team belonging to Club B', async () => {
    await request(httpServer)
      .delete(`/teams/${clubBTeamId}`)
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(403);
  });

  it('Club B admin cannot update a player belonging to Club A', async () => {
    await request(httpServer)
      .put(`/players/${clubAPlayerId}`)
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .send({ firstName: 'Hacked' })
      .expect(403);
  });

  it('Club B admin cannot delete a player belonging to Club A', async () => {
    await request(httpServer)
      .delete(`/players/${clubAPlayerId}`)
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .expect(403);
  });

  // ─── Cross-tenant read (GET by ID) blocked ─────────────────

  it('Club A admin can GET a specific team from Club B (spectator name resolution)', async () => {
    // GET /teams/:id is intentionally not tenant-checked so viewers (who may
    // belong to no club) can resolve team names for matches they spectate.
    // Team writes remain tenant-isolated (see update/delete tests above).
    await request(httpServer)
      .get(`/teams/${clubBTeamId}`)
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(200);
  });

  it('Club A admin cannot GET a specific player from Club B', async () => {
    await request(httpServer)
      .get(`/players/${clubBPlayerId}`)
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(403);
  });

  // ─── Same-tenant access allowed ────────────────────────────

  it('Club A admin can GET their own team', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get(`/teams/${clubATeamId}`)
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<{ id: string }>;
    expect(body.data.id).toBe(clubATeamId);
  });

  it('Club B admin can update their own player', async () => {
    const res: SupertestResponse = await request(httpServer)
      .put(`/players/${clubBPlayerId}`)
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .send({ firstName: 'Updated' })
      .expect(200);

    const body = res.body as ApiEnvelope<{ firstName: string }>;
    expect(body.data.firstName).toBe('Updated');
  });

  // ─── List scoping (users only see their own club) ──────────

  it('Club A admin listing teams sees only Club A teams', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/teams')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<Array<{ clubId: string }>>;
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    body.data.forEach((team) => {
      expect(team.clubId).toBe(clubAId);
    });
  });

  it('Club B admin listing players sees only Club B players', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/players')
      .set('Authorization', `Bearer ${clubBAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<Array<{ teamId: string }>>;
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    // All players should belong to Club B's team
    body.data.forEach((player) => {
      expect(player.teamId).toBe(clubBTeamId);
    });
  });

  it('Club A admin listing clubs sees only Club A', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/clubs')
      .set('Authorization', `Bearer ${clubAAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<Array<{ id: string }>>;
    expect(body.data.length).toBe(1);
    expect(body.data[0].id).toBe(clubAId);
  });

  // ─── SUPER_ADMIN bypasses all tenant restrictions ──────────

  it('SUPER_ADMIN can access Club B team', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get(`/teams/${clubBTeamId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<{ id: string }>;
    expect(body.data.id).toBe(clubBTeamId);
  });

  it('SUPER_ADMIN listing teams sees all teams from all clubs', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/teams')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<Array<{ clubId: string }>>;
    const clubIds = [...new Set(body.data.map((t) => t.clubId))];
    expect(clubIds.length).toBeGreaterThanOrEqual(2);
  });
});
