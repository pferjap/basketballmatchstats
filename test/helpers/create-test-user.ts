import request, { Response as SupertestResponse } from 'supertest';
import { PrismaService } from '../../src/database/prisma.service';

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

/**
 * Registers a user via the public endpoint (VIEWER, no club),
 * then promotes them to the desired role/club via Prisma and
 * logs in again to get a JWT with the correct claims.
 */
export async function createTestUser(
  httpServer: Parameters<typeof request>[0],
  prisma: PrismaService,
  opts: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    clubId?: string | null;
  },
): Promise<{ accessToken: string; userId: string }> {
  const password = opts.password ?? 'securepassword123';

  // 1. Register (always creates VIEWER with no club)
  const regRes: SupertestResponse = await request(httpServer)
    .post('/auth/register')
    .send({
      email: opts.email,
      password,
      firstName: opts.firstName ?? 'Test',
      lastName: opts.lastName ?? 'User',
    });

  const regBody = regRes.body as ApiEnvelope<AuthResponse>;
  const userId = regBody.data.user.id;

  const needsPromotion = (opts.role && opts.role !== 'VIEWER') || opts.clubId;

  if (!needsPromotion) {
    return { accessToken: regBody.data.accessToken, userId };
  }

  // 2. Promote via Prisma
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(opts.role ? { role: opts.role } : {}),
      ...(opts.clubId !== undefined ? { clubId: opts.clubId } : {}),
    },
  });

  // 3. Login again to get JWT with updated claims
  const loginRes: SupertestResponse = await request(httpServer)
    .post('/auth/login')
    .send({ email: opts.email, password });

  const loginBody = loginRes.body as ApiEnvelope<AuthResponse>;

  return { accessToken: loginBody.data.accessToken, userId };
}
