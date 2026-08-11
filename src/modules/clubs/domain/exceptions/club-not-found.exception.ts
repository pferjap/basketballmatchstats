import { DomainException } from '../../../../common/exceptions/domain.exception';

export class ClubNotFoundException extends DomainException {
  readonly code = 'CLUB_NOT_FOUND';
  readonly statusCode = 404;

  constructor(clubId: string) {
    super(`No club was found with id "${clubId}".`);
  }
}
