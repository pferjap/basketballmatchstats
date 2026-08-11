import { UnprocessableEntityException } from '@nestjs/common';

export class InvalidEventException extends UnprocessableEntityException {
  constructor(reason: string) {
    super(`Invalid event: ${reason}`);
  }
}
