import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/domain/enums/user-role.enum';
import {
  TENANT_CHECK_KEY,
  TenantCheckMetadata,
} from '../decorators/tenant-check.decorator';
import type { ITenantOwnershipResolver } from './interfaces/tenant-ownership-resolver.interface';
import { TENANT_OWNERSHIP_RESOLVER } from './interfaces/tenant-ownership-resolver.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TENANT_OWNERSHIP_RESOLVER)
    private readonly ownershipResolver: ITenantOwnershipResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const tenantCheck = this.reflector.getAllAndOverride<
      TenantCheckMetadata | undefined
    >(TENANT_CHECK_KEY, [context.getHandler(), context.getClass()]);

    // No @TenantCheck() metadata → skip tenant validation
    if (!tenantCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: { role?: UserRole; clubId?: string | null };
      params?: Record<string, string>;
    }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // SUPER_ADMIN bypasses tenant isolation
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // Users without a clubId cannot access tenant-scoped resources
    if (!user.clubId) {
      throw new ForbiddenException('User is not associated with any club');
    }

    const resourceId = request.params?.[tenantCheck.paramName];

    if (!resourceId) {
      // No resource ID in the route — can't verify, let downstream handle
      return true;
    }

    const resourceClubId = await this.ownershipResolver.resolveClubId(
      tenantCheck.resourceType,
      resourceId,
    );

    // If resource doesn't exist, let the use-case throw a proper 404
    if (resourceClubId === null) {
      return true;
    }

    if (resourceClubId !== user.clubId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    return true;
  }
}
