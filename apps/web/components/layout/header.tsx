'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight, CircleHelp, Command, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { CREATE_ITEMS, openSearch } from './constants';
import { NotificationBell } from './notification-bell';
import { initials, roleLabel } from '@/lib/utils';

export function Header({
  user, label, connected, on, onOpenShortcuts,
}: {
  user: { name: string; role: string };
  label: string;
  connected: boolean;
  on: any;
  onOpenShortcuts: () => void;
}) {
  const [create, setCreate] = useState(false);
  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date());

  return (
    <header className="app-header">
      <nav aria-label="Breadcrumb" className="hidden min-w-0 shrink-0 items-center gap-1.5 text-xs text-muted-foreground lg:flex">
        <span className="truncate">Không gian làm việc</span>
        <ChevronRight size={12} />
        <span className="truncate font-semibold text-foreground">{label}</span>
      </nav>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <button type="button" onClick={openSearch} className="global-search group w-full max-w-lg">
          <Search size={17} />
          <span className="flex-1 truncate text-left text-sm text-muted-foreground">Tìm khách hàng, dự án, công việc...</span>
          <span className="search-key"><Command size={10} /> K</span>
        </button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {/* Tạo mới */}
        <div className="relative">
          <button type="button" onClick={() => setCreate((v) => !v)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={16} />
            <span className="hidden sm:inline">Tạo mới</span>
          </button>
          {create && (
            <>
              <button type="button" aria-label="Đóng menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setCreate(false)} />
              <div role="menu" className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-card py-1 shadow-lg">
                <p className="px-3 py-2 text-[11px] font-medium text-muted-foreground">Tạo nhanh</p>
                {CREATE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} role="menuitem" onClick={() => setCreate(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent">
                      <Icon size={15} className="text-muted-foreground" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Trạng thái realtime */}
        <span title={connected ? 'Đang cập nhật trực tiếp' : 'Mất kết nối'} className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground md:inline-flex">
          <span className={`size-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
          {connected ? 'Trực tiếp' : 'Ngoại tuyến'}
        </span>

        {/* Ngày -> mở lịch */}
        <Link href="/calendar" className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-xs capitalize text-muted-foreground hover:bg-accent xl:inline-flex">
          <CalendarDays size={14} />
          {dateLabel}
        </Link>

        <button type="button" onClick={onOpenShortcuts} className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent" title="Phím tắt (?)">
          <CircleHelp size={18} />
        </button>

        {/* Component Chuông (Đã tách) */}
        <NotificationBell on={on} />

        <span className="mx-1 hidden h-6 border-l border-border sm:block" />

        {/* Người dùng */}
        <Link href="/users" className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-accent">
          <span className="avatar-initials avatar-profile inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {initials(user.name)}
          </span>
          <span className="hidden text-left leading-tight md:block">
            <span className="block max-w-[140px] truncate text-xs font-semibold">{user.name}</span>
            <span className="block text-[10px] text-muted-foreground">{roleLabel(user.role)}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}