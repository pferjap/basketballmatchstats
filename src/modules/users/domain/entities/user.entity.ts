import { UserRole } from '../enums/user-role.enum';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  clubId: string | null;
  refreshToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly clubId: string | null;
  readonly refreshToken: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.role = props.role;
    this.clubId = props.clubId;
    this.refreshToken = props.refreshToken;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
