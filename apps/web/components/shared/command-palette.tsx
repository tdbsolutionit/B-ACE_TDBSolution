'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Briefcase,
  CalendarPlus,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow } from '@/lib/crm';
import { initials } from '@/lib/utils';

// <-- SỬA LẠI TYPE CHO ĐÚNG VỚI API TRẢ VỀ -->
type OpportunityRow = {
  id: string;
  code?: string;
  name: string;      // API trả về 'name', không phải 'title'
  value?: number;
  stage?: string;
  customer?: string; // API trả về 'customer', không phải 'customerName'
};

type TaskRow = {
  id: string;
  title: string;
  dueDate?: string;
  customer?: string;
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ⌘K / Ctrl+K để mở
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lazy load data lần đầu mở
  useEffect(() => {
    if (!open || loaded) return;
    setLoaded(true);
    Promise.all([
      api<CustomerRow[]>('/customers').catch(() => []),
      api<OpportunityRow[]>('/opportunities').catch(() => []),
      api<TaskRow[]>('/tasks').catch(() => []),
    ]).then(([c, o, t]) => {
      setCustomers(c);
      setOpportunities(o);
      setTasks(t);
    });
  }, [open, loaded]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command Palette"
        className="fixed left-1/2 top-[15%] z-[101] w-[640px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={18} className="text-muted-foreground" />
          <Command.Input
            placeholder="Tìm khách, dự án, công việc hoặc gõ lệnh..." // <-- Sửa placeholder
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ESC
          </kbd>
        </div>

        <Command.List className="max-h-[420px] overflow-y-auto p-2">
          <Command.Empty className="py-8 text-center text-sm text-muted-foreground">
            Không tìm thấy kết quả.
          </Command.Empty>

          {/* HÀNH ĐỘNG NHANH */}
          <Command.Group
            heading="Hành động nhanh"
            className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
          >
            <Item onSelect={() => go('customers?new=1')} icon={<UserPlus size={16} />}>
              Tạo khách hàng mới
            </Item>
            <Item onSelect={() => go('/projects?new=1')} icon={<Plus size={16} />}>
              Tạo dự án mới
            </Item>
            <Item onSelect={() => go('/tasks?new=1')} icon={<CalendarPlus size={16} />}>
              Tạo công việc mới
            </Item>
          </Command.Group>

          {/* KHÁCH HÀNG */}
          {customers.length > 0 && (
            <Command.Group
              heading={`Khách hàng (${customers.length})`}
              className="mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
            >
              {customers.slice(0, 20).map((c) => (
                <Item
                  key={c.id}
                  value={`kh ${c.name} ${c.company || ''} ${c.phone || ''}`}
                  onSelect={() => go(`/customers/${c.id}`)}
                  icon={
                    <span className="avatar-initials inline-flex size-7 items-center justify-center rounded-full text-[10px] font-semibold">
                      {initials(c.name)}
                    </span>
                  }
                >
                  <span className="flex flex-1 items-center justify-between">
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      {c.company && (
                        <span className="text-[11px] text-muted-foreground">{c.company}</span>
                      )}
                    </span>
                    {c.phone && (
                      <span className="text-[11px] text-muted-foreground">{c.phone}</span>
                    )}
                  </span>
                </Item>
              ))}
            </Command.Group>
          )}

          {/* DỰ ÁN */}
          {opportunities.length > 0 && (
            <Command.Group
              heading={`Dự án (${opportunities.length})`} // <-- Đổi tên heading
              className="mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
            >
              {opportunities.slice(0, 15).map((o) => (
                <Item
                  key={o.id}
                  // <-- SỬA VALUE ĐỂ TÌM KIẾM ĐƯỢC -->
                  value={`duan ${o.name} ${o.code || ''} ${o.customer || ''}`} 
                  onSelect={() => go(`/projects/${o.id}`)} // <-- SỬA LINK ĐIỀU HƯỚNG
                  icon={<FolderKanban size={16} />} // <-- Đổi icon
                >
                  <span className="flex flex-1 items-center justify-between">
                    <span className="font-medium flex items-center gap-2">
                      {o.code && <span className="text-xs text-muted-foreground">{o.code}</span>}
                      {o.name} 
                    </span>
                    {o.value != null && (
                      <span className="text-[11px] font-medium text-primary">
                        {formatCompactVND(o.value)}
                      </span>
                    )}
                  </span>
                </Item>
              ))}
            </Command.Group>
          )}

          {/* CÔNG VIỆC */}
          {tasks.length > 0 && (
            <Command.Group
              heading={`Công việc (${tasks.length})`}
              className="mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
            >
              {tasks.slice(0, 10).map((t) => (
                <Item
                  key={t.id}
                  value={`task ${t.title} ${t.customer || ''}`}
                  onSelect={() => go('/tasks')}
                  icon={<ListTodo size={16} />}
                >
                  <span className="flex flex-1 items-center justify-between">
                    <span className="font-medium">{t.title}</span>
                    {t.dueDate && (
                      <span className="text-[11px] text-muted-foreground">
                        {t.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </span>
                </Item>
              ))}
            </Command.Group>
          )}

          {/* ĐIỀU HƯỚNG */}
          <Command.Group
            heading="Điều hướng"
            className="mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground [&_[cmdk-group-items]]:mt-1"
          >
            <Item onSelect={() => go('/')} icon={<LayoutDashboard size={16} />}>
              Tổng quan
            </Item>
            <Item onSelect={() => go('customers')} icon={<Users size={16} />}>
              Khách hàng
            </Item>
            <Item onSelect={() => go('/projects')} icon={<FolderKanban size={16} />}>
              Dự án
            </Item>
            <Item onSelect={() => go('/tasks')} icon={<ListTodo size={16} />}>
              Công việc
            </Item>
            <Item onSelect={() => go('/users')} icon={<Settings size={16} />}>
              Tài khoản
            </Item>
          </Command.Group>
        </Command.List>

        {/* Footer hints */}
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>
              di chuyển
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
              chọn
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            mở/đóng
          </div>
        </div>
      </Command.Dialog>
    </>
  );
}

function Item({
  children,
  icon,
  value,
  onSelect,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  value?: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
    >
      <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </Command.Item>
  );
}

function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}