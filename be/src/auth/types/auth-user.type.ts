import { RoleCode } from '../../common/enums/role.enum';

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  roles: RoleCode[];
};
