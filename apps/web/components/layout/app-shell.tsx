'use client';

import { Loading } from '@/components/shared/loading';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/shared/command-palette';
import { api, useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { useGotoSequence } from '@/hooks/use-goto-sequence';
import { ShortcutsHelp } from '@/components/shared/shortcuts-help';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Celebration } from '@/components/shared/celebration';
import { flushChime } from './audio';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { HelpModal } from './help-modal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session, logout } = useAuth();
  const { on, connected } = useRealtime();

  const [collapsed, setCollapsed] = useState(false);
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const [help, setHelp] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  const [celebration, setCelebration] = useState<{ dealName: string; value?: number; owner?: string; at: string; } | null>(null);

  // SỬA LỖI: Chỉ phụ thuộc vào ID của user thay vì toàn bộ object session
  const userId = session?.user?.sub || session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const loadLogo = () => {
      api<{ logoUrl: string | null }>('/tenants/me').then((res) => setTenantLogo(res.logoUrl)).catch(() => setTenantLogo(null));
    };
    loadLogo();
    window.addEventListener('tenant:updated', loadLogo);
    return () => window.removeEventListener('tenant:updated', loadLogo);
  }, [userId]);

  useEffect(() => { setCollapsed(isNarrow); }, [isNarrow]);

  useGotoSequence({ h: '/', c: '/customers', d: '/projects', o: '/deals', t: '/tasks', l: '/calendar', r: '/reports', i: '/integrations', s: '/settings' }, (path) => router.push(path));

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (event.key === '/' && !inInput) { event.preventDefault(); import('./constants').then(m => m.openSearch()); return; }
      if (event.key === '?' && !inInput) { event.preventDefault(); setShowShortcuts(true); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => { if (ready && !session) router.replace('/login'); }, [ready, session, router]);

  useEffect(() => {
    const unlock = () => flushChime();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // SỬA LỖI: Phụ thuộc vào userId thay vì session
  useEffect(() => {
    if (!userId) return;
    const unsub1 = on('deal:stage-changed', (event: any) => {
      if (event.payload?.status !== 'won') return;
      setCelebration({ dealName: event.payload.name, value: event.payload.value, owner: event.payload.owner, at: event.at });
    });
    const unsub2 = on('quote:accepted', (event: any) => {
      setCelebration({ dealName: `Báo giá ${event.payload?.quoteNumber || ''}`, value: event.payload?.price, owner: event.payload?.title, at: event.at });
    });
    return () => { unsub1(); unsub2(); };
  }, [userId, on]);

  const label = useMemo(() => {
    if (pathname.startsWith('/customers')) return 'Khách hàng';
    if (pathname.startsWith('/projects')) return 'Dự án';
    if (pathname.startsWith('/deals')) return 'Cơ hội';
    if (pathname.startsWith('/tasks')) return 'Công việc';
    if (pathname.startsWith('/calendar')) return 'Lịch';
    if (pathname.startsWith('/reports')) return 'Báo cáo';
    if (pathname.startsWith('/quotes')) return 'Báo giá';
    if (pathname.startsWith('/users')) return 'Quản lý';
    if (pathname.startsWith('/search')) return 'Tìm kiếm';
    if (pathname.startsWith('/integrations')) return 'Integration Hub';
    if (pathname.startsWith('/settings')) return 'Cài đặt';
    return 'Tổng quan';
  }, [pathname]);

  if (!ready || !session) {
    return <Loading text="Đang mở không gian làm việc" fullscreen />;
  }

  const user = session.user;
  const handleLogout = () => { logout(); router.replace('/login'); };

  return (
    <>
      <CommandPalette />
      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <Celebration open={!!celebration} data={celebration} onClose={() => setCelebration(null)} />
      
      <div className={collapsed ? 'sidebar-collapsed app-shell' : 'app-shell'}>
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} user={user} tenantLogo={tenantLogo} onOpenHelp={() => setHelp(true)} onLogout={handleLogout} />

        <div className="app-main">
          <Header user={user} label={label} connected={connected} on={on} onOpenShortcuts={() => setShowShortcuts(true)} />
          
          <main className={`page-content ${pathname.startsWith('customers') ? 'split-view-active' : ''}`}>
            {children}
          </main>
        </div>

        <HelpModal open={help} onClose={() => setHelp(false)} />
      </div>
    </>
  );
}