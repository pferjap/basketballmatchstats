import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/domain/enums/user-role.enum';
import { TenantGuard } from './tenant.guard';
import type { ITenantOwnershipResolver } from './interfaces/tenant-ownership-resolver.interface';

function createMockContext(
  user?: { role: UserRole; clubId: string | null },
  params?: Record<string, string>,
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let resolver: jest.Mocked<ITenantOwnershipResolver>;

  beforeEach(() => {
    reflector = new Reflector();
    resolver = {
      resolveClubId: jest.fn(),
    };
    guard = new TenantGuard(reflector, resolver);
  });

  it('should allow when no @TenantCheck() metadata is set', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(
      { role: UserRole.VIEWER, clubId: 'club-a' },
      { id: 'resource-1' },
    );

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow SUPER_ADMIN regardless of clubId mismatch', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'team',
    });
    const context = createMockContext(
      { role: UserRole.SUPER_ADMIN, clubId: 'club-different' },
      { id: 'team-1' },
    );

    expect(await guard.canActivate(context)).toBe(true);
    expect(resolver.resolveClubId).not.toHaveBeenCalled();
  });

  it('should allow when user clubId matches resource clubId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'team',
    });
    resolver.resolveClubId.mockResolvedValue('club-a');
    const context = createMockContext(
      { role: UserRole.CLUB_ADMIN, clubId: 'club-a' },
      { id: 'team-1' },
    );

    expect(await guard.canActivate(context)).toBe(true);
    expect(resolver.resolveClubId).toHaveBeenCalledWith('team', 'team-1');
  });

  it('should throw ForbiddenException when clubId does not match', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'team',
    });
    resolver.resolveClubId.mockResolvedValue('club-b');
    const context = createMockContext(
      { role: UserRole.CLUB_ADMIN, clubId: 'club-a' },
      { id: 'team-1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user has no clubId', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'team',
    });
    const context = createMockContext(
      { role: UserRole.COACH, clubId: null },
      { id: 'team-1' },
    );

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(resolver.resolveClubId).not.toHaveBeenCalled();
  });

  it('should allow when resource does not exist (let 404 happen downstream)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'player',
    });
    resolver.resolveClubId.mockResolvedValue(null);
    const context = createMockContext(
      { role: UserRole.CLUB_ADMIN, clubId: 'club-a' },
      { id: 'non-existent' },
    );

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow when route param is missing (no resource to check)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      paramName: 'id',
      resourceType: 'team',
    });
    const context = createMockContext(
      { role: UserRole.CLUB_ADMIN, clubId: 'club-a' },
      {}, // no 'id' param
    );

    expect(await guard.canActivate(context)).toBe(true);
  });
});
