import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaTenantOwnershipResolver } from './common/guards/interfaces/prisma-tenant-ownership-resolver';
import { TENANT_OWNERSHIP_RESOLVER } from './common/guards/interfaces/tenant-ownership-resolver.interface';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { envValidationSchema } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClubsModule } from './modules/clubs/clubs.module';
import { EventsModule } from './modules/events/events.module';
import { MatchesModule } from './modules/matches/matches.module';
import { PlayersModule } from './modules/players/players.module';
import { SetupModule } from './modules/setup/setup.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UsersModule } from './modules/users/users.module';
import { WebSocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    AuthModule,
    ClubsModule,
    TeamsModule,
    PlayersModule,
    MatchesModule,
    EventsModule,
    SetupModule,
    WebSocketModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: TENANT_OWNERSHIP_RESOLVER,
      useClass: PrismaTenantOwnershipResolver,
    },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
