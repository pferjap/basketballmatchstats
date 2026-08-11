export interface ClubProperties {
  id: string;
  name: string;
  city: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pure domain entity for a Club (tenant/organization root of the hierarchy).
 * Immutable snapshot with no framework or ORM dependencies.
 */
export class Club {
  readonly id: string;
  readonly name: string;
  readonly city: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: ClubProperties) {
    this.id = properties.id;
    this.name = properties.name;
    this.city = properties.city;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }
}
