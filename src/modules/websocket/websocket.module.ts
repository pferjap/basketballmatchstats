import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MatchesModule } from '../matches/matches.module';
import { MatchGateway } from './gateways/match.gateway';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { MatchEventListener } from './listeners/match-event.listener';

@Module({
  imports: [
    MatchesModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  providers: [MatchGateway, WsJwtGuard, MatchEventListener],
  exports: [MatchGateway],
})
export class WebSocketModule {}
