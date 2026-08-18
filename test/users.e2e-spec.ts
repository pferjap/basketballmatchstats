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

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  clubId: string | null;
  clubName: string | null;
  createdAt: string;
}

interface PaginatedUsers {
  data: UserResponse[];
  meta: { page: number; limit: number; total: number };
}

describe('Users (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpServer: Parameters<typeof request>[0];

  const suffix = Date.now();
  const superAdminEmail = `users-sa-${suffix}@test.com`;
  const clubAdminAEmail = `users-ca-a-${suffix}@test.com`;
  const clubAdminBEmail = `users-ca-b-${suffix}@test.com`;
  const coachEmail = `users-coach-${suffix}@test.com`;
  const viewerEmail = `users-viewer-${suffix}@test.com`;
  const targetUserEmail = `users-target-${suffix}@test.com`;

  let superAdminToken: string;
  let superAdminId: string;
  let clubAdminAToken: string;
  let clubAdminBToken: string;
  let coachToken: string;
  let viewerToken: string;
  let targetUserId: string;
  let clubAId: string;
  let clubBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    prisma = app.get(PrismaService);
    httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    // SUPER_ADMIN
    const sa = await createTestUser(httpServer, prisma, {
      email: superAdminEmail,
      role: 'SUPER_ADMIN',
    });
    superAdminToken = sa.accessToken;
    superAdminId = sa.userId;

    // Create two clubs
    const clubARes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Club A' });
    clubAId = (clubARes.body as ApiEnvelope<{ id: string }>).data.id;

    const clubBRes: SupertestResponse = await request(httpServer)
      .post('/clubs')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ name: 'Club B' });
    clubBId = (clubBRes.body as ApiEnvelope<{ id: string }>).data.id;

    // CLUB_ADMIN for Club A
    clubAdminAToken = (
      await createTestUser(httpServer, prisma, {
        email: clubAdminAEmail,
        role: 'CLUB_ADMIN',
        clubId: clubAId,
      })
    ).accessToken;

    // CLUB_ADMIN for Club B
    clubAdminBToken = (
      await createTestUser(httpServer, prisma, {
        email: clubAdminBEmail,
        role: 'CLUB_ADMIN',
        clubId: clubBId,
      })
    ).accessToken;

    // COACH in Club A
    coachToken = (
      await createTestUser(httpServer, prisma, {
        email: coachEmail,
        role: 'COACH',
        clubId: clubAId,
      })
    ).accessToken;

    // VIEWER (no club)
    viewerToken = (
      await createTestUser(httpServer, prisma, {
        email: viewerEmail,
      })
    ).accessToken;

    // Target user: registered as VIEWER, no club
    targetUserId = (
      await createTestUser(httpServer, prisma, {
        email: targetUserEmail,
      })
    ).userId;
  });

  afterAll(async () => {
    await prisma.team.deleteMany();
    await prisma.club.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            superAdminEmail,
            clubAdminAEmail,
            clubAdminBEmail,
            coachEmail,
            viewerEmail,
            targetUserEmail,
          ],
        },
      },
    });
    await app?.close();
  });

  // ─── RBAC: unauthorized roles get 403 ─────────────────────────

  it('VIEWER cannot GET /users (403)', async () => {
    await request(httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('COACH cannot GET /users (403)', async () => {
    await request(httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${coachToken}`)
      .expect(403);
  });

  it('VIEWER cannot GET /users/:id (403)', async () => {
    await request(httpServer)
      .get(`/users/${targetUserId}`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .expect(403);
  });

  it('COACH cannot PATCH /users/:id/role (403)', async () => {
    await request(httpServer)
      .patch(`/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${coachToken}`)
      .send({ role: 'STATISTICIAN' })
      .expect(403);
  });

  it('VIEWER cannot PATCH /users/:id/club (403)', async () => {
    await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ clubId: clubAId })
      .expect(403);
  });

  it('unauthenticated request returns 401', async () => {
    await request(httpServer).get('/users').expect(401);
  });

  // ─── SUPER_ADMIN: full access ─────────────────────────────────

  it('SUPER_ADMIN can list all users', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<PaginatedUsers>;
    expect(body.success).toBe(true);
    expect(body.data.data.length).toBeGreaterThan(0);
    expect(body.data.meta.total).toBeGreaterThan(0);
  });

  it('SUPER_ADMIN can list users with search filter', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/users')
      .query({ search: 'target' })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<PaginatedUsers>;
    const emails = body.data.data.map((u) => u.email);
    expect(emails).toContain(targetUserEmail);
  });

  it('SUPER_ADMIN can get user by id', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get(`/users/${targetUserId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<UserResponse>;
    expect(body.data.id).toBe(targetUserId);
    expect(body.data.email).toBe(targetUserEmail);
    expect(body.data.role).toBe('VIEWER');
    expect(body.data.clubId).toBeNull();
    expect(body.data.clubName).toBeNull();
    expect(body.data.createdAt).toBeDefined();
    // Sensitive fields never exposed
    expect((body.data as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((body.data as unknown as Record<string, unknown>).refreshToken).toBeUndefined();
  });

  // ─── Full admin flow: assign club then update role ────────────

  it('SUPER_ADMIN assigns club to target user', async () => {
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ clubId: clubAId })
      .expect(200);

    const body = res.body as ApiEnvelope<UserResponse>;
    expect(body.data.clubId).toBe(clubAId);
    expect(body.data.clubName).toBe('Club A');
  });

  it('SUPER_ADMIN elevates target user role to STATISTICIAN', async () => {
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'STATISTICIAN' })
      .expect(200);

    const body = res.body as ApiEnvelope<UserResponse>;
    expect(body.data.role).toBe('STATISTICIAN');
  });

  it('target user re-logs in and gets updated claims', async () => {
    const res: SupertestResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: targetUserEmail, password: 'securepassword123' })
      .expect(200);

    const body = res.body as ApiEnvelope<{
      user: { role: string; clubId: string };
    }>;
    expect(body.data.user.role).toBe('STATISTICIAN');
    expect(body.data.user.clubId).toBe(clubAId);
  });

  // ─── Business rule: cannot modify own role ────────────────────

  it('SUPER_ADMIN cannot modify their own role (403)', async () => {
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${superAdminId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'VIEWER' })
      .expect(403);

    const body = res.body as ApiError;
    expect(body.errors[0].code).toBe('CANNOT_MODIFY_OWN_ROLE');
  });

  // ─── Business rule: cannot assign SUPER_ADMIN ─────────────────

  it('rejects assignment of SUPER_ADMIN role (400)', async () => {
    await request(httpServer)
      .patch(`/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ role: 'SUPER_ADMIN' })
      .expect(400);
  });

  // ─── Business rule: club must exist ───────────────────────────

  it('rejects assignment of nonexistent club (404)', async () => {
    const fakeClubId = '00000000-0000-0000-0000-000000000000';
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ clubId: fakeClubId })
      .expect(404);

    const body = res.body as ApiError;
    expect(body.errors[0].code).toBe('CLUB_NOT_FOUND');
  });

  it('allows disassociating user from club (null clubId)', async () => {
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ clubId: null })
      .expect(200);

    const body = res.body as ApiEnvelope<UserResponse>;
    expect(body.data.clubId).toBeNull();
    expect(body.data.clubName).toBeNull();
  });

  // ─── Tenancy: CLUB_ADMIN scoped to own club ──────────────────

  it('CLUB_ADMIN of Club A sees only Club A users in list', async () => {
    // Re-assign target user to Club A first
    await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ clubId: clubAId });

    const res: SupertestResponse = await request(httpServer)
      .get('/users')
      .set('Authorization', `Bearer ${clubAdminAToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<PaginatedUsers>;
    const clubIds = body.data.data.map((u) => u.clubId);
    expect(clubIds.every((cid) => cid === clubAId)).toBe(true);
  });

  it('CLUB_ADMIN of Club A can get a user in Club A', async () => {
    await request(httpServer)
      .get(`/users/${targetUserId}`)
      .set('Authorization', `Bearer ${clubAdminAToken}`)
      .expect(200);
  });

  it('CLUB_ADMIN of Club B cannot get a user in Club A (403)', async () => {
    await request(httpServer)
      .get(`/users/${targetUserId}`)
      .set('Authorization', `Bearer ${clubAdminBToken}`)
      .expect(403);
  });

  it('CLUB_ADMIN of Club A can update role for a user in Club A', async () => {
    const res: SupertestResponse = await request(httpServer)
      .patch(`/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${clubAdminAToken}`)
      .send({ role: 'COACH' })
      .expect(200);

    const body = res.body as ApiEnvelope<UserResponse>;
    expect(body.data.role).toBe('COACH');
  });

  it('CLUB_ADMIN of Club B cannot update role for a user in Club A (403)', async () => {
    await request(httpServer)
      .patch(`/users/${targetUserId}/role`)
      .set('Authorization', `Bearer ${clubAdminBToken}`)
      .send({ role: 'VIEWER' })
      .expect(403);
  });

  it('CLUB_ADMIN cannot PATCH /users/:id/club (403)', async () => {
    await request(httpServer)
      .patch(`/users/${targetUserId}/club`)
      .set('Authorization', `Bearer ${clubAdminAToken}`)
      .send({ clubId: clubBId })
      .expect(403);
  });

  // ─── User not found ──────────────────────────────────────────

  it('returns 404 for nonexistent user id', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res: SupertestResponse = await request(httpServer)
      .get(`/users/${fakeId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(404);

    const body = res.body as ApiError;
    expect(body.errors[0].code).toBe('USER_NOT_FOUND');
  });

  // ─── Pagination ───────────────────────────────────────────────

  it('respects page and limit query params', async () => {
    const res: SupertestResponse = await request(httpServer)
      .get('/users')
      .query({ page: 1, limit: 2 })
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    const body = res.body as ApiEnvelope<PaginatedUsers>;
    expect(body.data.data.length).toBeLessThanOrEqual(2);
    expect(body.data.meta.page).toBe(1);
    expect(body.data.meta.limit).toBe(2);
  });
});
