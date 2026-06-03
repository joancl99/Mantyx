export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  role?: UserRole;
}

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Administrador',
  MANAGER: 'Manager',
  OPERATOR: 'Operario',
  VIEWER: 'Solo lectura',
};
