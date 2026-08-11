import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module';
import { EVENT_REPOSITORY } from './domain/interfaces/event.repository.interface';
import { EventValidationService } from './domain/services/event-validation.service';
import { CreateEventUseCase } from './application/use-cases/create-event.use-case';
import { GetEventUseCase } from './application/use-cases/get-event.use-case';
import { ListMatchEventsUseCase } from './application/use-cases/list-match-events.use-case';
import { VoidEventUseCase } from './application/use-cases/void-event.use-case';
import { EventController } from './infrastructure/controllers/event.controller';
import { PrismaEventRepository } from './infrastructure/repositories/prisma-event.repository';

@Module({
  imports: [MatchesModule],
  controllers: [EventController],
  providers: [
    EventValidationService,
    CreateEventUseCase,
    GetEventUseCase,
    ListMatchEventsUseCase,
    VoidEventUseCase,
    { provide: EVENT_REPOSITORY, useClass: PrismaEventRepository },
  ],
  exports: [
    EVENT_REPOSITORY,
    EventValidationService,
    CreateEventUseCase,
    GetEventUseCase,
    ListMatchEventsUseCase,
    VoidEventUseCase,
  ],
})
export class EventsModule {}
