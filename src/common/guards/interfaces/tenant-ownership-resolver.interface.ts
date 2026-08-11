import { TenantResourceType } from '../../decorators/tenant-check.decorator';

/** DI token for the TenantOwnershipResolver. */
export const TENANT_OWNERSHIP_RESOLVER = Symbol('TENANT_OWNERSHIP_RESOLVER');

/**
 * Resolves the owning clubId for a given resource.
 * Implemented in the infrastructure layer where DB access is available.
 */
export interface ITenantOwnershipResolver {
  /**
   * Returns the clubId that owns the given resource, or null if the resource
   * does not exist (let downstream 404 handling take care of that).
   */
  resolveClubId(
    resourceType: TenantResourceType,
    resourceId: string,
  ): Promise<string | null>;
}
