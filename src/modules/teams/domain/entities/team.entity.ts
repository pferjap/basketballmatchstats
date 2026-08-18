export interface TeamProperties {
  id: string;
  name: string;
  clubId: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure domain entity for a Team, which always belongs to a Club.
 * Immutable snapshot with no framework or ORM dependencies.
 */
export class Team {
  readonly id: string;
  readonly name: string;
  readonly clubId: string;
  readonly logoUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: TeamProperties) {
    this.id = properties.id;
    this.name = properties.name;
    this.clubId = properties.clubId;
    this.logoUrl = properties.logoUrl;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }
}
