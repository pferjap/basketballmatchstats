import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/domain/enums/user-role.enum';
import { RolesGuard } from './roles.guard';

function createMockContext(user?: { role: string }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow when no @Roles() metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: UserRole.VIEWER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when @Roles() is empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext({ role: UserRole.VIEWER });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow when user role matches one of the required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.CLUB_ADMIN, UserRole.COACH]);
    const context = createMockContext({ role: UserRole.COACH });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user role does not match', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.SUPER_ADMIN]);
    const context = createMockContext({ role: UserRole.VIEWER });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should always allow SUPER_ADMIN regardless of required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.CLUB_ADMIN]);
    const context = createMockContext({ role: UserRole.SUPER_ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when no user on request', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.CLUB_ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user has no role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.CLUB_ADMIN]);
    const context = createMockContext({ role: '' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
