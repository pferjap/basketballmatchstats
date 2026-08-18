export class UserResponseDto {
  id!: string;
  email!: string;
  firstName!: string;
  lastName!: string;
  role!: string;
  clubId!: string | null;
  clubName!: string | null;
  createdAt!: string;
}
