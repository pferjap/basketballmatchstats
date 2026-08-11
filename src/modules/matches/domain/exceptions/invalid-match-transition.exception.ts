import { ConflictException } from '@nestjs/common';

export class InvalidMatchTransitionException extends ConflictException {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition match from "${currentStatus}" to "${targetStatus}"`,
    );
  }
}
