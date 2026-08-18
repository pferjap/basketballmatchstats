import { Club } from '../entities/club.entity';

/** DI token for the Club repository port. */
export const CLUB_REPOSITORY = Symbol('CLUB_REPOSITORY');

export interface CreateClubData {
  name: string;
  city: string | null;
}

export interface UpdateClubData {
  name?: string;
  city?: string | null;
}

export interface ClubPaginationParams {
  skip: number;
  take: number;
  clubId?: string;
}

/**
 * Outbound port for Club persistence. Application use-cases depend on this
 * abstraction; the Prisma implementation lives in the infrastructure layer.
 */
export interface IClubRepository {
  create(data: CreateClubData): Promise<Club>;
  findById(id: string): Promise<Club | null>;
  findMany(params: ClubPaginationParams): Promise<Club[]>;
  count(clubId?: string): Promise<number>;
  update(id: string, data: UpdateClubData): Promise<Club>;
  updateLogoUrl(id: string, logoUrl: string | null): Promise<Club>;
  delete(id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
}
