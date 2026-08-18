import { SetMetadata } from '@nestjs/common';

/**
 * Resource types that TenantGuard can resolve ownership for.
 * Each corresponds to a different lookup strategy to find the owning clubId.
 */
export type TenantResourceType = 'club' | 'team' | 'player' | 'match' | 'event' | 'user';

export interface TenantCheckMetadata {
  /** The route param name holding the resource ID (e.g., 'id'). */
  paramName: string;
  /** The type of resource being accessed. */
  resourceType: TenantResourceType;
}

export const TENANT_CHECK_KEY = 'tenantCheck';

/**
 * Marks an endpoint for tenant ownership validation.
 * TenantGuard will extract the resource ID from the specified route param
 * and verify the current user's clubId matches the resource's owning club.
 *
 * @param resourceType - The type of resource ('club', 'team', 'player')
 * @param paramName - The route param name (defaults to 'id')
 */
export const TenantCheck = (
  resourceType: TenantResourceType,
  paramName = 'id',
) => SetMetadata(TENANT_CHECK_KEY, { paramName, resourceType });
