import { DomainException } from '../../../../common/exceptions/domain.exception';

export class PlayerNotFoundException extends DomainException {
  readonly code = 'PLAYER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(playerId: string) {
    super(`No player was found with id "${playerId}".`);
  }
}
