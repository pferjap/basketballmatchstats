import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { TenantCheck } from '../../../../common/decorators/tenant-check.decorator';
import { PaginatedResult } from '../../../../common/pagination/paginated-result';
import { UserRole } from '../../../users/domain/enums/user-role.enum';
import { CreateEventDto } from '../../application/dtos/create-event.dto';
import { ListMatchEventsQueryDto } from '../../application/dtos/list-match-events-query.dto';
import type { EventResponseDto } from '../../application/dtos/event-response.dto';
import { EventMapper } from '../mappers/event.mapper';
import { CreateEventUseCase } from '../../application/use-cases/create-event.use-case';
import { GetEventUseCase } from '../../application/use-cases/get-event.use-case';
import { ListMatchEventsUseCase } from '../../application/use-cases/list-match-events.use-case';
import { VoidEventUseCase } from '../../application/use-cases/void-event.use-case';

@Controller()
export class EventController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly getEventUseCase: GetEventUseCase,
    private readonly listMatchEventsUseCase: ListMatchEventsUseCase,
    private readonly voidEventUseCase: VoidEventUseCase,
  ) {}

  @Post('matches/:matchId/events')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLUB_ADMIN,
    UserRole.COACH,
    UserRole.STATISTICIAN,
  )
  @TenantCheck('match', 'matchId')
  async create(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Body() dto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.createEventUseCase.execute(matchId, dto);
    return EventMapper.toResponse(event);
  }

  @Get('matches/:matchId/events')
  @TenantCheck('match', 'matchId')
  async listByMatch(
    @Param('matchId', ParseUUIDPipe) matchId: string,
    @Query() query: ListMatchEventsQueryDto,
  ): Promise<PaginatedResult<EventResponseDto>> {
    const { data, total, page, limit } =
      await this.listMatchEventsUseCase.execute({
        matchId,
        eventType: query.eventType,
        teamId: query.teamId,
        playerId: query.playerId,
        period: query.period,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      });

    return new PaginatedResult(
      data.map((e) => EventMapper.toResponse(e)),
      { page, limit, total },
    );
  }

  @Get('events/:id')
  @TenantCheck('event')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto> {
    const event = await this.getEventUseCase.execute(id);
    return EventMapper.toResponse(event);
  }

  @Patch('events/:id/void')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.CLUB_ADMIN,
    UserRole.COACH,
    UserRole.STATISTICIAN,
  )
  @TenantCheck('event')
  async voidEvent(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto> {
    const event = await this.voidEventUseCase.execute(id);
    return EventMapper.toResponse(event);
  }
}
