import { DomainException } from '../../../../common/exceptions/domain.exception';

export class InvalidRoleAssignmentException extends DomainException {
  readonly code = 'INVALID_ROLE_ASSIGNMENT';
  readonly statusCode = 400;

  constructor(role: string) {
    super(`Cannot assign role: ${role}`);
  }
}
