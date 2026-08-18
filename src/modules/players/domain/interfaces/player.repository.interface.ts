import { Player, PlayerPosition } from '../entities/player.entity';

export const PLAYER_REPOSITORY = Symbol('PLAYER_REPOSITORY');

export interface CreatePlayerData {
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  teamId: string;
}

export interface UpdatePlayerData {
  firstName?: string;
  lastName?: string;
  jerseyNumber?: number | null;
  position?: PlayerPosition | null;
}

export interface PlayerFindManyParams {
  skip: number;
  take: number;
  teamId?: string;
  clubId?: string;
}

export interface IPlayerRepository {
  create(data: CreatePlayerData): Promise<Player>;
  findById(id: string): Promise<Player | null>;
  findMany(params: PlayerFindManyParams): Promise<Player[]>;
  count(teamId?: string): Promise<number>;
  countByClub(clubId: string, teamId?: string): Promise<number>;
  update(id: string, data: UpdatePlayerData): Promise<Player>;
  updatePhotoUrl(id: string, photoUrl: string | null): Promise<Player>;
  delete(id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
}
