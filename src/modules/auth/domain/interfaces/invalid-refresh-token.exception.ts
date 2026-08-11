import { DomainException } from '../../../../common/exceptions/domain.exception';

export class InvalidRefreshTokenException extends DomainException {
  readonly code = 'INVALID_REFRESH_TOKEN';
  readonly statusCode = 401;

  constructor() {
    super('The refresh token is invalid or has been revoked.');
  }
}
