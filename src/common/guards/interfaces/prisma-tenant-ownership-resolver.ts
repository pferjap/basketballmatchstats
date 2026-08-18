import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TenantResourceType } from '../../decorators/tenant-check.decorator';
import { ITenantOwnershipResolver } from './tenant-ownership-resolver.interface';

@Injectable()
export class PrismaTenantOwnershipResolver implements ITenantOwnershipResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveClubId(
    resourceType: TenantResourceType,
    resourceId: string,
  ): Promise<string | null> {
    switch (resourceType) {
      case 'club':
        return this.resolveClubOwnership(resourceId);
      case 'team':
        return this.resolveTeamOwnership(resourceId);
      case 'player':
        return this.resolvePlayerOwnership(resourceId);
      case 'match':
        return this.resolveMatchOwnership(resourceId);
      case 'event':
        return this.resolveEventOwnership(resourceId);
      case 'user':
        return this.resolveUserOwnership(resourceId);
    }
  }

  private async resolveClubOwnership(clubId: string): Promise<string | null> {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true },
    });

    return club ? club.id : null;
  }

  private async resolveTeamOwnership(teamId: string): Promise<string | null> {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { clubId: true },
    });

    return team ? team.clubId : null;
  }

  private async resolvePlayerOwnership(
    playerId: string,
  ): Promise<string | null> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { team: { select: { clubId: true } } },
    });

    return player ? player.team.clubId : null;
  }

  private async resolveMatchOwnership(matchId: string): Promise<string | null> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: { clubId: true },
    });

    return match ? match.clubId : null;
  }

  private async resolveEventOwnership(eventId: string): Promise<string | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { match: { select: { clubId: true } } },
    });

    return event ? event.match.clubId : null;
  }

  private async resolveUserOwnership(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });

    return user ? user.clubId : null;
  }
}
