import { NotFoundException } from '@nestjs/common';

export class EventNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Event with id "${id}" not found`);
  }
}
