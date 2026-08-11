import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { Response as SupertestResponse } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttpPipeline } from '../src/common/bootstrap/configure-http-pipeline';
import { PrismaService } from '../src/database/prisma.service';

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    clubId: string | null;
  };
}

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

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testEmail = `e2e-auth-${Date.now()}@test.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpPipeline(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await app?.close();
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let accessToken: string;
  let refreshToken: string;

  it('POST /auth/register — registers a new user', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'securepassword123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    const body = res.body as ApiEnvelope<AuthResponse>;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.user.role).toBe('VIEWER');

    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it('POST /auth/register — rejects duplicate email', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'anotherpassword1',
        firstName: 'Dup',
        lastName: 'User',
      })
      .expect(409);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('POST /auth/login — authenticates with valid credentials', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: testEmail, password: 'securepassword123' })
      .expect(200);

    const body = res.body as ApiEnvelope<AuthResponse>;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.user.email).toBe(testEmail);

    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it('POST /auth/login — rejects invalid password', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/login')
      .send({ email: testEmail, password: 'wrong-password11' })
      .expect(401);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe('INVALID_CREDENTIALS');
  });

  it('POST /auth/refresh — rotates the refresh token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    const body = res.body as ApiEnvelope<AuthResponse>;
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();

    // Store the new tokens for subsequent tests
    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it('POST /auth/refresh — rejects an invalid refresh token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const res: SupertestResponse = await request(httpServer)
      .post('/auth/refresh')
      .send({ refreshToken: 'completely-invalid-token' })
      .expect(401);

    const body = res.body as ApiError;
    expect(body.success).toBe(false);
    expect(body.errors[0].code).toBe('INVALID_REFRESH_TOKEN');
  });
});
