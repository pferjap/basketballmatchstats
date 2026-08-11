import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload = {
    sub: 'user-id-1',
    email: 'test@example.com',
    role: 'CLUB_ADMIN',
    clubId: 'club-id-1',
  };

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new WsJwtGuard(jwtService, configService);
  });

  function createMockContext(
    auth?: { token?: string },
    headers?: Record<string, string>,
  ): ExecutionContext {
    const client = {
      handshake: {
        auth: auth || {},
        headers: headers || {},
      },
      data: {},
    };
    return {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow connection with valid token in auth.token', () => {
    jwtService.verify.mockReturnValue(mockPayload);
    const context = createMockContext({ token: 'valid-token' });

    expect(guard.canActivate(context)).toBe(true);

    const client = (
      context.switchToWs() as { getClient: () => { data: { user: unknown } } }
    ).getClient();
    expect(client.data.user).toEqual(mockPayload);
  });

  it('should allow connection with valid Bearer token in headers', () => {
    jwtService.verify.mockReturnValue(mockPayload);
    const context = createMockContext(
      {},
      { authorization: 'Bearer valid-token' },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should prefer auth.token over Authorization header', () => {
    jwtService.verify.mockReturnValue(mockPayload);
    const context = createMockContext(
      { token: 'auth-token' },
      { authorization: 'Bearer header-token' },
    );

    guard.canActivate(context);

    expect(jwtService.verify).toHaveBeenCalledWith('auth-token', {
      secret: 'test-secret',
    });
  });

  it('should throw WsException when no token is provided', () => {
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(WsException);
    expect(() => guard.canActivate(context)).toThrow(
      'Missing authentication token',
    );
  });

  it('should throw WsException when token is invalid', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const context = createMockContext({ token: 'expired-token' });

    expect(() => guard.canActivate(context)).toThrow(WsException);
    expect(() => guard.canActivate(context)).toThrow(
      'Invalid or expired token',
    );
  });

  it('should use JWT_ACCESS_SECRET from config', () => {
    jwtService.verify.mockReturnValue(mockPayload);
    const context = createMockContext({ token: 'valid-token' });

    guard.canActivate(context);

    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_ACCESS_SECRET');
    expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
  });

  it('should not extract token from non-Bearer header', () => {
    const context = createMockContext({}, { authorization: 'Basic abc123' });

    expect(() => guard.canActivate(context)).toThrow(
      'Missing authentication token',
    );
  });
});
