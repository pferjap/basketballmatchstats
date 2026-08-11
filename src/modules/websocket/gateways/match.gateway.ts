import { Inject, Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../../auth/infrastructure/strategies/jwt.strategy';
import { UserRole } from '../../users/domain/enums/user-role.enum';
import { WsJwtGuard } from '../guards/ws-jwt.guard';
import type { IMatchRepository } from '../../matches/domain/interfaces/match.repository.interface';
import { MATCH_REPOSITORY } from '../../matches/domain/interfaces/match.repository.interface';

export interface JoinMatchPayload {
  matchId: string;
}

export interface LeaveMatchPayload {
  matchId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/matches',
})
@UseGuards(WsJwtGuard)
export class MatchGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MatchGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(MATCH_REPOSITORY)
    private readonly matchRepository: IMatchRepository,
  ) {}

  afterInit(): void {
    this.logger.log('Match WebSocket Gateway initialized');
  }

  /**
   * Validates JWT on connection handshake. Disconnects unauthorized clients.
   */
  handleConnection(@ConnectedSocket() client: Socket): void {
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} rejected: no token`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      (client.data as { user: JwtPayload }).user = payload;
      this.logger.log(
        `Client ${client.id} connected (user: ${payload.email}, role: ${payload.role})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Client requests to join a match room. Validates match existence and tenant access.
   */
  @SubscribeMessage('joinMatch')
  async handleJoinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinMatchPayload,
  ): Promise<{
    event: string;
    data: { success: boolean; matchId: string; message?: string };
  }> {
    const { matchId } = payload;

    if (!matchId) {
      throw new WsException('matchId is required');
    }

    const user = (client.data as { user: JwtPayload }).user;
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new WsException(`Match ${matchId} not found`);
    }

    // Tenant isolation: viewers can join any room (public broadcasting);
    // other roles must belong to the match's club unless SUPER_ADMIN
    if (
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.VIEWER &&
      user.clubId !== match.clubId
    ) {
      throw new WsException('Access denied: match belongs to another club');
    }

    await client.join(`match:${matchId}`);
    this.logger.log(`Client ${client.id} joined room match:${matchId}`);

    return {
      event: 'matchJoined',
      data: { success: true, matchId },
    };
  }

  /**
   * Client requests to leave a match room.
   */
  @SubscribeMessage('leaveMatch')
  async handleLeaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: LeaveMatchPayload,
  ): Promise<{ event: string; data: { success: boolean; matchId: string } }> {
    const { matchId } = payload;

    if (!matchId) {
      throw new WsException('matchId is required');
    }

    await client.leave(`match:${matchId}`);
    this.logger.log(`Client ${client.id} left room match:${matchId}`);

    return {
      event: 'matchLeft',
      data: { success: true, matchId },
    };
  }

  /**
   * Emits an event to all clients in a specific match room.
   */
  emitToMatch(matchId: string, eventName: string, data: unknown): void {
    this.server.to(`match:${matchId}`).emit(eventName, data);
  }

  /**
   * Gets the number of clients currently in a match room.
   */
  async getMatchRoomSize(matchId: string): Promise<number> {
    const sockets = await this.server.in(`match:${matchId}`).fetchSockets();
    return sockets.length;
  }

  private extractToken(client: Socket): string | null {
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) {
      return authToken;
    }

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }
}
