import { IsEnum } from 'class-validator';
import { UserRole } from '../../domain/enums/user-role.enum';

const ASSIGNABLE_ROLES = [
  UserRole.CLUB_ADMIN,
  UserRole.COACH,
  UserRole.STATISTICIAN,
  UserRole.VIEWER,
] as const;

type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export class UpdateUserRoleDto {
  @IsEnum(ASSIGNABLE_ROLES, {
    message: `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
  })
  role!: AssignableRole;
}
