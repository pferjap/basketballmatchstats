export enum PlayerPosition {
  POINT_GUARD = 'POINT_GUARD',
  SHOOTING_GUARD = 'SHOOTING_GUARD',
  SMALL_FORWARD = 'SMALL_FORWARD',
  POWER_FORWARD = 'POWER_FORWARD',
  CENTER = 'CENTER',
}

export interface PlayerProperties {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: number | null;
  position: PlayerPosition | null;
  teamId: string;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Player {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly jerseyNumber: number | null;
  readonly position: PlayerPosition | null;
  readonly teamId: string;
  readonly photoUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(properties: PlayerProperties) {
    this.id = properties.id;
    this.firstName = properties.firstName;
    this.lastName = properties.lastName;
    this.jerseyNumber = properties.jerseyNumber;
    this.position = properties.position;
    this.teamId = properties.teamId;
    this.photoUrl = properties.photoUrl;
    this.createdAt = properties.createdAt;
    this.updatedAt = properties.updatedAt;
  }
}
