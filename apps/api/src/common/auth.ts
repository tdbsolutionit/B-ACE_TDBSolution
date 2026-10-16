import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Array<'admin' | 'manager' | 'sales'>) =>
  SetMetadata(ROLES_KEY, roles);

export type AuthUser = {
  // ─── Field cũ (GIỮ NGUYÊN, không xóa) ───
  sub: string;
  tenantId: string;
  role: 'admin' | 'manager' | 'sales';
  email: string;
  name: string;

  // ─── Field mới (thêm vào, optional) ───
  roleId?: string;
  roleName?: string;
  teamId?: string | null;
  permissions?: string[];
};

/** Every business query must carry tenant_id. Empty tenant is a hard failure. */
export function scope(tenantId: string, where: Record<string, unknown> = {}) {
  if (!tenantId) {
    throw new Error('TENANT_ID_REQUIRED');
  }
  return { ...where, tenantId };
}

/** Sales only sees records assigned to them. Admin and manager see the tenant. */
export function owned(user: AuthUser, where: Record<string, unknown> = {}) {
  const base = scope(user.tenantId, where);
  if (user.role === 'sales') return { ...base, assignedTo: user.sub };
  return base;
}