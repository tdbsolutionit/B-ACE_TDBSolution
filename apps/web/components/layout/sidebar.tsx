'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleHelp, Layers3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV } from './constants';
import { SidebarUser } from './sidebar-user';

export function Sidebar({
  collapsed, setCollapsed, user, tenantLogo, onOpenHelp, onLogout,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  user: { name: string; role: string };
  tenantLogo: string | null;
  onOpenHelp: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <Link href="/" className="brand py-4 mb-2 flex w-full justify-center bg-transparent hover:bg-transparent">
        {tenantLogo ? (
          <img src={tenantLogo} alt="Logo" className="h-10 w-auto max-w-[160px] object-contain" />
        ) : (
          <>
            <span className="brand-symbol bg-transparent"><Layers3 size={22} /></span>
            <span className="brand-name text-lg font-bold">
              B-ACE<span className="font-normal text-muted-foreground"> SME</span>
            </span>
          </>
        )}
      </Link>

      <nav className="space-y-1.5 px-3">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} title={item.label} className={`${active ? 'nav-item nav-active' : 'nav-item'} ${collapsed ? 'justify-center px-0' : ''}`}>
              <Icon size={19} className="shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button type="button" onClick={onOpenHelp} className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">
          <CircleHelp size={18} />
          {!collapsed && <span>Trợ giúp & hỗ trợ</span>}
        </button>
        <button type="button" onClick={() => setCollapsed(!collapsed)} className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent whitespace-nowrap">
          {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!collapsed && <span className="truncate">Thu gọn</span>}
        </button>

        <SidebarUser user={user} collapsed={collapsed} onLogout={onLogout} />
      </div>
    </aside>
  );
}