'use client';

import Link from 'next/link';
import { ChevronsUpDown, LogOut, ShieldCheck, UserPen } from 'lucide-react';
import { useState } from 'react';
import { initials, roleLabel } from '@/lib/utils';

type User = { name: string; role: string };

export function SidebarUser({
  user, collapsed, onLogout,
}: {
  user: User;
  collapsed: boolean;
  onLogout: () => void;
}) {
  const [menu, setMenu] = useState(false);

  return (
    <div className="mt-4">
      {/* NÚT ĐĂNG XUẤT (Giống hình 2) */}
      <button
        type="button"
        onClick={onLogout}
        title="Đăng xuất"
        className={`mt-3 flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors ${collapsed ? 'justify-center px-0' : ''}`}
      >
        <LogOut size={18} className="shrink-0" />
        {!collapsed && <span>Đăng xuất</span>}
      </button>
    </div>
  );
}