'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleHelp, Layers3, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_GROUPS } from './constants';
import { SidebarUser } from './sidebar-user';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  tenantLogo: string | null;
  onOpenHelp: () => void;
  onLogout: () => void;
}

export function Sidebar({
  collapsed,
  setCollapsed,
  tenantLogo,
  onOpenHelp,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar flex flex-col h-full">
      <Link 
        href="/" 
        className={`brand mb-2 flex w-full items-center bg-transparent py-4 hover:bg-transparent transition-all ${
          collapsed ? 'justify-center px-0' : 'justify-center gap-2 px-4'
        }`}
      >
        {tenantLogo ? (
          <img 
            src={tenantLogo} 
            alt="Logo" 
            className={`w-auto object-contain transition-all ${collapsed ? 'h-8' : 'h-10 max-w-[160px]'}`} 
          />
        ) : (
          <>
            <span className="brand-symbol shrink-0 bg-transparent">
              <Layers3 size={22} />
            </span>
            {!collapsed && (
              <span className="brand-name text-lg font-bold truncate">
                B-ACE<span className="font-normal text-muted-foreground"> SME</span>
              </span>
            )}
          </>
        )}
      </Link>

      <div className="flex-1 overflow-y-auto px-3 pb-4 overflow-x-hidden">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.title} className="mb-5">
            {!collapsed ? (
              <h3 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </h3>
            ) : (
              index > 0 && <div className="mx-auto my-3 h-px w-8 bg-border" />
            )}

            <nav className="space-y-1">
              {group.items.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`${active ? 'nav-item nav-active' : 'nav-item'} flex items-center rounded-md transition-colors ${
                      collapsed ? 'justify-center px-0' : 'gap-3 px-3'
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar-bottom border-t border-border pt-3 flex flex-col gap-1">
        <button 
          type="button" 
          onClick={onOpenHelp} 
          className={`flex w-full items-center rounded-md py-2 text-muted-foreground hover:bg-accent transition-colors ${
            collapsed ? 'justify-center px-0' : 'gap-2 px-3'
          }`}
        >
          <CircleHelp size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">Trợ giúp & hỗ trợ</span>}
        </button>
        
        <button 
          type="button" 
          onClick={() => setCollapsed(!collapsed)} 
          className={`flex w-full items-center rounded-md py-2 text-muted-foreground hover:bg-accent transition-colors ${
            collapsed ? 'justify-center px-0' : 'gap-2 px-3'
          }`}
        >
          {collapsed ? <PanelLeftOpen size={18} className="shrink-0" /> : <PanelLeftClose size={18} className="shrink-0" />}
          {!collapsed && <span className="truncate">Thu gọn</span>}
        </button>

        <SidebarUser collapsed={collapsed} onLogout={onLogout} />
      </div>
    </aside>
  );
}