import { DomainException } from '../../../../common/exceptions/domain.exception';

export class InvalidCredentialsException extends DomainException {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;

  constructor() {
    super('Invalid email or password.');
  }
}
