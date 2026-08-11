import { ApiMeta } from '../interfaces/api-response.interface';

/**
 * Wraps a page of items together with its pagination metadata.
 * The global ResponseInterceptor detects this type and lifts `meta`
 * to the top level of the standard API envelope.
 */
export class PaginatedResult<T> {
  constructor(
    readonly data: T[],
    readonly meta: ApiMeta,
  ) {}
}
