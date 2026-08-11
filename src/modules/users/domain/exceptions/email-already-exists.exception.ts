import { DomainException } from '../../../../common/exceptions/domain.exception';

export class EmailAlreadyExistsException extends DomainException {
  readonly code = 'EMAIL_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(email: string) {
    super(`A user with the email "${email}" already exists.`);
  }
}
