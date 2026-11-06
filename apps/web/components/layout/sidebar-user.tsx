'use client';

import { LogOut } from 'lucide-react';

interface SidebarUserProps {
  collapsed: boolean;
  onLogout: () => void;
}

export function SidebarUser({ collapsed, onLogout }: SidebarUserProps) {
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onLogout}
        title="Đăng xuất"
        className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <LogOut size={18} className="shrink-0" />
        {!collapsed && <span>Đăng xuất</span>}
      </button>
    </div>
  );
}