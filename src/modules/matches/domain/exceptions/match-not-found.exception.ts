import { NotFoundException } from '@nestjs/common';

export class MatchNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Match with id "${id}" not found`);
  }
}
