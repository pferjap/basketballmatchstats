import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { JwtPayload } from '../../auth/infrastructure/strategies/jwt.strategy';

/**
 * Guard for WebSocket connections. Validates the JWT from the handshake
 * auth token or Authorization header and attaches the payload to socket.data.user.
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      (client.data as { user: JwtPayload }).user = payload;
      return true;
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Priority 1: auth.token in handshake
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) {
      return authToken;
    }

    // Priority 2: Authorization header (Bearer <token>)
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }
}
