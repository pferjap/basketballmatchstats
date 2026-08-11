import { MatchEventListener } from './match-event.listener';
import { MatchGateway } from '../gateways/match.gateway';
import {
  MatchEventCreatedPayload,
  MatchEventVoidedPayload,
} from '../../events/domain/events/match-event.events';
import { EventEntity } from '../../events/domain/entities/event.entity';
import { EventType } from '../../events/domain/enums/event-type.enum';

describe('MatchEventListener', () => {
  let listener: MatchEventListener;
  let matchGateway: jest.Mocked<MatchGateway>;

  beforeEach(() => {
    matchGateway = {
      emitToMatch: jest.fn(),
    } as unknown as jest.Mocked<MatchGateway>;

    listener = new MatchEventListener(matchGateway);
  });

  describe('handleEventCreated', () => {
    it('should broadcast event.created to the match room', () => {
      const event = new EventEntity({
        id: 'evt-1',
        matchId: 'match-1',
        teamId: 'team-1',
        playerId: 'player-1',
        eventType: EventType.POINTS_MADE,
        period: 1,
        gameClock: '05:30',
        coordinates: { x: 50, y: 70 },
        metadata: { points: 2 },
        isVoided: false,
        createdAt: new Date('2024-01-01'),
      });

      const payload = new MatchEventCreatedPayload('match-1', event);
      listener.handleEventCreated(payload);

      expect(matchGateway.emitToMatch).toHaveBeenCalledWith(
        'match-1',
        'event.created',
        {
          id: 'evt-1',
          matchId: 'match-1',
          teamId: 'team-1',
          playerId: 'player-1',
          eventType: EventType.POINTS_MADE,
          period: 1,
          gameClock: '05:30',
          coordinates: { x: 50, y: 70 },
          metadata: { points: 2 },
          createdAt: new Date('2024-01-01'),
        },
      );
    });

    it('should handle event without player or coordinates', () => {
      const event = new EventEntity({
        id: 'evt-2',
        matchId: 'match-2',
        teamId: 'team-1',
        playerId: null,
        eventType: EventType.TIMEOUT,
        period: 2,
        gameClock: '03:00',
        coordinates: null,
        metadata: null,
        isVoided: false,
        createdAt: new Date('2024-01-01'),
      });

      const payload = new MatchEventCreatedPayload('match-2', event);
      listener.handleEventCreated(payload);

      expect(matchGateway.emitToMatch).toHaveBeenCalledWith(
        'match-2',
        'event.created',
        expect.objectContaining({
          id: 'evt-2',
          playerId: null,
          coordinates: null,
          metadata: null,
        }),
      );
    });
  });

  describe('handleEventVoided', () => {
    it('should broadcast event.voided to the match room', () => {
      const payload = new MatchEventVoidedPayload('match-1', 'evt-1');
      listener.handleEventVoided(payload);

      expect(matchGateway.emitToMatch).toHaveBeenCalledWith(
        'match-1',
        'event.voided',
        { eventId: 'evt-1', matchId: 'match-1' },
      );
    });
  });
});
