import { CreateEventUseCase } from './create-event.use-case';
import { GetEventUseCase } from './get-event.use-case';
import { ListMatchEventsUseCase } from './list-match-events.use-case';
import { VoidEventUseCase } from './void-event.use-case';
import { EventEntity } from '../../domain/entities/event.entity';
import { EventType } from '../../domain/enums/event-type.enum';
import { EventValidationService } from '../../domain/services/event-validation.service';
import { MatchEntity } from '../../../matches/domain/entities/match.entity';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { MatchNotFoundException } from '../../../matches/domain/exceptions/match-not-found.exception';
import { EventNotFoundException } from '../../domain/exceptions/event-not-found.exception';
import { InvalidEventException } from '../../domain/exceptions/invalid-event.exception';
import type { IEventRepository } from '../../domain/interfaces/event.repository.interface';
import type { IMatchRepository } from '../../../matches/domain/interfaces/match.repository.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockEvent = (overrides: Partial<EventEntity> = {}): EventEntity =>
  new EventEntity({
    id: 'event-1',
    matchId: 'match-1',
    teamId: 'team-1',
    playerId: 'player-1',
    eventType: EventType.POINTS_MADE,
    period: 1,
    gameClock: '05:30',
    coordinates: { x: 50, y: 70 },
    metadata: { points: 2 },
    isVoided: false,
    createdAt: new Date(),
    ...overrides,
  });

const mockMatch = (): MatchEntity =>
  new MatchEntity({
    id: 'match-1',
    clubId: 'club-1',
    homeTeamId: 'team-1',
    awayTeamId: 'team-2',
    status: MatchStatus.ONGOING,
    scheduledAt: new Date(),
    startedAt: new Date(),
    finishedAt: null,
    period: 2,
    gameClock: '08:00',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('Event Use Cases', () => {
  let eventRepository: jest.Mocked<IEventRepository>;
  let matchRepository: jest.Mocked<IMatchRepository>;
  let validationService: EventValidationService;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    eventRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      voidEvent: jest.fn(),
    };
    matchRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    validationService = new EventValidationService();
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
  });

  describe('CreateEventUseCase', () => {
    it('should create an event when match is ONGOING and data is valid', async () => {
      const useCase = new CreateEventUseCase(
        eventRepository,
        matchRepository,
        validationService,
        eventEmitter,
      );
      matchRepository.findById.mockResolvedValue(mockMatch());
      eventRepository.create.mockResolvedValue(mockEvent());

      const result = await useCase.execute('match-1', {
        teamId: 'team-1',
        playerId: 'player-1',
        eventType: EventType.POINTS_MADE,
        period: 1,
        gameClock: '05:30',
        coordinates: { x: 50, y: 70 },
        metadata: { points: 2 },
      });

      expect(result.id).toBe('event-1');
      expect(eventRepository.create).toHaveBeenCalledWith({
        matchId: 'match-1',
        teamId: 'team-1',
        playerId: 'player-1',
        eventType: EventType.POINTS_MADE,
        period: 1,
        gameClock: '05:30',
        coordinates: { x: 50, y: 70 },
        metadata: { points: 2 },
      });
    });

    it('should emit MATCH_EVENT_CREATED after successful persistence', async () => {
      const useCase = new CreateEventUseCase(
        eventRepository,
        matchRepository,
        validationService,
        eventEmitter,
      );
      matchRepository.findById.mockResolvedValue(mockMatch());
      const createdEvent = mockEvent();
      eventRepository.create.mockResolvedValue(createdEvent);

      await useCase.execute('match-1', {
        teamId: 'team-1',
        playerId: 'player-1',
        eventType: EventType.POINTS_MADE,
        period: 1,
        gameClock: '05:30',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'match.event.created',
        expect.objectContaining({ matchId: 'match-1', event: createdEvent }),
      );
    });

    it('should throw MatchNotFoundException when match does not exist', async () => {
      const useCase = new CreateEventUseCase(
        eventRepository,
        matchRepository,
        validationService,
        eventEmitter,
      );
      matchRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('missing', {
          teamId: 'team-1',
          playerId: 'player-1',
          eventType: EventType.POINTS_MADE,
          period: 1,
          gameClock: '05:30',
        }),
      ).rejects.toThrow(MatchNotFoundException);
    });

    it('should throw InvalidEventException when match is not ONGOING', async () => {
      const useCase = new CreateEventUseCase(
        eventRepository,
        matchRepository,
        validationService,
        eventEmitter,
      );
      const scheduledMatch = new MatchEntity({
        ...mockMatch(),
        status: MatchStatus.SCHEDULED,
      });
      matchRepository.findById.mockResolvedValue(scheduledMatch);

      await expect(
        useCase.execute('match-1', {
          teamId: 'team-1',
          playerId: 'player-1',
          eventType: EventType.POINTS_MADE,
          period: 1,
          gameClock: '05:30',
        }),
      ).rejects.toThrow(InvalidEventException);
    });
  });

  describe('GetEventUseCase', () => {
    it('should return event by id', async () => {
      const useCase = new GetEventUseCase(eventRepository);
      eventRepository.findById.mockResolvedValue(mockEvent());

      const result = await useCase.execute('event-1');
      expect(result.id).toBe('event-1');
    });

    it('should throw EventNotFoundException', async () => {
      const useCase = new GetEventUseCase(eventRepository);
      eventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        EventNotFoundException,
      );
    });
  });

  describe('ListMatchEventsUseCase', () => {
    it('should return paginated events', async () => {
      const useCase = new ListMatchEventsUseCase(eventRepository);
      eventRepository.findMany.mockResolvedValue([mockEvent()]);
      eventRepository.count.mockResolvedValue(1);

      const result = await useCase.execute({
        matchId: 'match-1',
        page: 1,
        limit: 50,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('VoidEventUseCase', () => {
    it('should void an existing event', async () => {
      const useCase = new VoidEventUseCase(eventRepository, eventEmitter);
      eventRepository.findById.mockResolvedValue(mockEvent());
      eventRepository.voidEvent.mockResolvedValue(
        mockEvent({ isVoided: true }),
      );

      const result = await useCase.execute('event-1');
      expect(result.isVoided).toBe(true);
    });

    it('should emit MATCH_EVENT_VOIDED after successful void', async () => {
      const useCase = new VoidEventUseCase(eventRepository, eventEmitter);
      eventRepository.findById.mockResolvedValue(mockEvent());
      eventRepository.voidEvent.mockResolvedValue(
        mockEvent({ isVoided: true }),
      );

      await useCase.execute('event-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'match.event.voided',
        expect.objectContaining({ matchId: 'match-1', eventId: 'event-1' }),
      );
    });

    it('should throw EventNotFoundException', async () => {
      const useCase = new VoidEventUseCase(eventRepository, eventEmitter);
      eventRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('missing')).rejects.toThrow(
        EventNotFoundException,
      );
    });

    it('should throw InvalidEventException when already voided', async () => {
      const useCase = new VoidEventUseCase(eventRepository, eventEmitter);
      eventRepository.findById.mockResolvedValue(mockEvent({ isVoided: true }));

      await expect(useCase.execute('event-1')).rejects.toThrow(
        InvalidEventException,
      );
    });
  });
});
