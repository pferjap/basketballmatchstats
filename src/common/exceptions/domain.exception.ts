/**
 * Base class for pure domain errors. It carries a semantic `code` and the
 * HTTP `statusCode` used by the global HttpExceptionFilter to build the
 * standard error envelope, while staying free of any NestJS dependency.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
