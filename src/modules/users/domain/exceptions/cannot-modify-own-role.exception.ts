import { DomainException } from '../../../../common/exceptions/domain.exception';

export class CannotModifyOwnRoleException extends DomainException {
  readonly code = 'CANNOT_MODIFY_OWN_ROLE';
  readonly statusCode = 403;

  constructor() {
    super('A user cannot modify their own role');
  }
}
