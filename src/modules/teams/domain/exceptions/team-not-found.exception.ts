import { DomainException } from '../../../../common/exceptions/domain.exception';

export class TeamNotFoundException extends DomainException {
  readonly code = 'TEAM_NOT_FOUND';
  readonly statusCode = 404;

  constructor(teamId: string) {
    super(`No team was found with id "${teamId}".`);
  }
}
