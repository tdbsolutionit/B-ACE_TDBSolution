export function legacyRoleFor(roleName: string): 'admin' | 'manager' | 'sales' {
  const n = roleName.toLowerCase();
  if (n.includes('quản trị') || n.includes('admin')) return 'admin';
  if (n.includes('quản lý') || n.includes('manager') || n.includes('trưởng')) return 'manager';
  return 'sales';
}