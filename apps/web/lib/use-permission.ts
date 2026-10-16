'use client';

import { useAuth } from '@/lib/auth';

export function usePermission() {
  const { session } = useAuth();
  const permissions = session?.user?.permissions ?? [];

  return {
    /** Kiểm tra 1 quyền cụ thể. VD: has('customer:delete') */
    has: (code: string) => permissions.includes(code),

    /** Kiểm tra có BẤT KỲ quyền nào trong list. */
    hasAny: (codes: string[]) => codes.some((c) => permissions.includes(c)),

    /** Kiểm tra có TẤT CẢ quyền. */
    hasAll: (codes: string[]) => codes.every((c) => permissions.includes(c)),

    /** Raw array để debug */
    all: permissions,
  };
}