import { Team } from '../entities/team.entity';

/** DI token for the Team repository port. */
export const TEAM_REPOSITORY = Symbol('TEAM_REPOSITORY');

export interface CreateTeamData {
  name: string;
  clubId: string;
}

export interface UpdateTeamData {
  name?: string;
}

export interface TeamFindManyParams {
  skip: number;
  take: number;
  clubId?: string;
}

/**
 * Outbound port for Team persistence. Listing and counting accept an optional
 * `clubId` filter so teams can be scoped to a single club.
 */
export interface ITeamRepository {
  create(data: CreateTeamData): Promise<Team>;
  findById(id: string): Promise<Team | null>;
  findMany(params: TeamFindManyParams): Promise<Team[]>;
  count(clubId?: string): Promise<number>;
  update(id: string, data: UpdateTeamData): Promise<Team>;
  updateLogoUrl(id: string, logoUrl: string | null): Promise<Team>;
  delete(id: string): Promise<void>;
  existsById(id: string): Promise<boolean>;
}
