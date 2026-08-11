import { EventValidationService } from './event-validation.service';
import { MatchStatus } from '../../../matches/domain/enums/match-status.enum';
import { EventType } from '../enums/event-type.enum';
import { InvalidEventException } from '../exceptions/invalid-event.exception';

describe('EventValidationService', () => {
  let service: EventValidationService;

  const defaultContext = {
    matchStatus: MatchStatus.ONGOING,
    matchPeriod: 2,
    homeTeamId: 'home-team',
    awayTeamId: 'away-team',
  };

  beforeEach(() => {
    service = new EventValidationService();
  });

  describe('validateMatchIsOngoing', () => {
    it('should pass when match is ONGOING', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.POINTS_MADE,
            teamId: 'home-team',
            playerId: 'player-1',
            period: 1,
          },
          defaultContext,
        ),
      ).not.toThrow();
    });

    it('should throw when match is SCHEDULED', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.POINTS_MADE,
            teamId: 'home-team',
            playerId: 'player-1',
            period: 1,
          },
          { ...defaultContext, matchStatus: MatchStatus.SCHEDULED },
        ),
      ).toThrow(InvalidEventException);
    });

    it('should throw when match is FINISHED', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.POINTS_MADE,
            teamId: 'home-team',
            playerId: 'player-1',
            period: 1,
          },
          { ...defaultContext, matchStatus: MatchStatus.FINISHED },
        ),
      ).toThrow(InvalidEventException);
    });
  });

  describe('validateTeamBelongsToMatch', () => {
    it('should pass for home team', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'home-team',
            playerId: null,
            period: 1,
          },
          defaultContext,
        ),
      ).not.toThrow();
    });

    it('should pass for away team', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'away-team',
            playerId: null,
            period: 1,
          },
          defaultContext,
        ),
      ).not.toThrow();
    });

    it('should throw for a team not in the match', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'other-team',
            playerId: null,
            period: 1,
          },
          defaultContext,
        ),
      ).toThrow(InvalidEventException);
    });
  });

  describe('validatePlayerRequired', () => {
    it('should pass when player-required event has playerId', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.POINTS_MADE,
            teamId: 'home-team',
            playerId: 'player-1',
            period: 1,
          },
          defaultContext,
        ),
      ).not.toThrow();
    });

    it('should throw when player-required event has no playerId', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.POINTS_MADE,
            teamId: 'home-team',
            playerId: null,
            period: 1,
          },
          defaultContext,
        ),
      ).toThrow(InvalidEventException);
    });

    it('should pass when team-level event has no playerId', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'home-team',
            playerId: null,
            period: 1,
          },
          defaultContext,
        ),
      ).not.toThrow();
    });
  });

  describe('validatePeriodConsistency', () => {
    it('should pass when event period <= match period', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'home-team',
            playerId: null,
            period: 2,
          },
          { ...defaultContext, matchPeriod: 2 },
        ),
      ).not.toThrow();
    });

    it('should throw when event period > match period', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'home-team',
            playerId: null,
            period: 3,
          },
          { ...defaultContext, matchPeriod: 2 },
        ),
      ).toThrow(InvalidEventException);
    });

    it('should throw when period < 1', () => {
      expect(() =>
        service.validate(
          {
            eventType: EventType.TIMEOUT,
            teamId: 'home-team',
            playerId: null,
            period: 0,
          },
          defaultContext,
        ),
      ).toThrow(InvalidEventException);
    });
  });
});
