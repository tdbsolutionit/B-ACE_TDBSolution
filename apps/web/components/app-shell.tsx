'use client';

import { Loading } from '@/components/loading';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Command,
  FolderKanban,
  Layers3,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sparkles,
  UserPen,
  UsersRound,
} from 'lucide-react';
import { api, useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { type TaskRow } from '@/lib/crm';
import { initials, roleLabel } from '@/lib/utils';

import { useRef } from 'react';
import { useGotoSequence } from '@/hooks/use-goto-sequence';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { useMediaQuery } from '@/hooks/use-media-query';
const NAV = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/khach-hang', label: 'Khách hàng', icon: UsersRound },
  { href: '/du-an', label: 'Dự án', icon: FolderKanban },
  { href: '/co-hoi', label: 'Cơ hội', icon: Layers3 },
  { href: '/cong-viec', label: 'Công việc', icon: ListTodo },
  { href: '/lich', label: 'Lịch', icon: CalendarDays },
  { href: '/bao-cao', label: 'Báo cáo', icon: ChartNoAxesCombined },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const isNarrow = useMediaQuery('(max-width: 1100px)');

  // Tự động collapse khi màn hình nhỏ
  useEffect(() => {
    setCollapsed(isNarrow);
  }, [isNarrow]);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [ring, setRing] = useState(false);
  const [overdue, setOverdue] = useState<TaskRow[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { on } = useRealtime();

  // Phím tắt G → X
  useGotoSequence(
    {
      h: '/',
      c: '/khach-hang',
      d: '/du-an',
      o: '/co-hoi',
      t: '/cong-viec',
      r: '/bao-cao',
    },
    (path) => router.push(path),
  );

  // Phím tắt / và ?
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // `/` focus search
      if (event.key === '/' && !inInput) {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // `?` mở help (Shift + /)
      if (event.key === '?' && !inInput) {
        event.preventDefault();
        setShowShortcuts(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (ready && !session) router.replace('/login');
  }, [ready, session, router]);

  useEffect(() => {
    const unlock = () => flushChime();
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  useEffect(() => {
    if (!session) return;
    api<TaskRow[]>('/tasks')
      .then((rows) => {
        const next = rows.filter((row) => row.overdue || row.dueToday || row.dueTomorrow);
        setOverdue(next);
        const signature = next.map((row) => row.id).sort().join(',');
        if (!signature || sessionStorage.getItem(NOTICE_SEEN) === signature) return;
        sessionStorage.setItem(NOTICE_SEEN, signature);
        setRing(true);
        window.setTimeout(() => setRing(false), 1800);
        playChime();
      })
      .catch(() => setOverdue([]));
  }, [session, pathname]);

    // Realtime: cập nhật chuông khi có task mới/cập nhật
  useEffect(() => {
    if (!session) return;

    const refresh = () => {
      api<TaskRow[]>('/tasks')
        .then((rows) => {
          const next = rows.filter((row) => row.overdue || row.dueToday || row.dueTomorrow);
          setOverdue(next);

          // Rung chuông + phát âm thanh nếu có thay đổi
          const signature = next.map((row) => row.id).sort().join(',');
          const seen = sessionStorage.getItem(NOTICE_SEEN);
          if (signature && seen !== signature) {
            setRing(true);
            window.setTimeout(() => setRing(false), 1800);
            playChime();
          }
        })
        .catch(() => {});
    };

    const unsub1 = on('task:created', refresh);
    const unsub2 = on('task:updated', refresh);
    return () => {
      unsub1();
      unsub2();
    };
  }, [session, on]);

  const label = useMemo(() => {
    if (pathname.startsWith('/khach-hang')) return 'Khách hàng';
    if (pathname.startsWith('/du-an')) return 'Dự án';
    if (pathname.startsWith('/co-hoi')) return 'Cơ hội';
    if (pathname.startsWith('/cong-viec')) return 'Công việc';
    if (pathname.startsWith('/lich')) return 'Lịch';
    if (pathname.startsWith('/bao-cao')) return 'Báo cáo';
    if (pathname.startsWith('/bao-gia')) return 'Báo giá';
    if (pathname.startsWith('/quan-ly')) return 'Người dùng';
    if (pathname.startsWith('/tim-kiem')) return 'Tìm kiếm';
    return 'Tổng quan';
  }, [pathname]);

  if (!ready || !session) {
    return <Loading text="Đang mở không gian làm việc" fullscreen />;
  }

  const user = session.user;
  const items = user.role === 'admin' ? [...NAV, { href: '/quan-ly/nguoi-dung', label: 'Người dùng', icon: ShieldCheck }] : NAV;
  const dateLabel = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <CommandPalette />
      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <div className={collapsed ? 'sidebar-collapsed app-shell' : 'app-shell'}>
        <aside className="app-sidebar">
          <Link href="/" className="brand">
            <span className="brand-symbol"><Layers3 size={22} /></span>
            <span className="brand-name text-lg font-bold">
              B-ACE<span className="font-normal text-muted-foreground"> SME</span>
            </span>
          </Link>
          <div className="workspace-label">{collapsed ? 'SME' : 'KHÔNG GIAN LÀM VIỆC'}</div>
          <nav className="space-y-1.5 px-3">
            {items.map((item) => {
              const active = item.href === '/'
                ? pathname === '/'
                : item.href === '/du-an'
                  ? pathname.startsWith('/du-an') || pathname.startsWith('/bao-gia')
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} title={item.label} className={active ? 'nav-item nav-active' : 'nav-item'}>
                  <Icon size={19} />
                  <span className="flex-1">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            {!collapsed && (
              <div className="team-note">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Sparkles size={15} color="#C9A961" />
                  Cùng nhau tăng trưởng
                </span>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Mỗi kết nối hôm nay,<br />một cơ hội cho ngày mai.
                </p>
                <Link href="/bao-cao" className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-[#C9A961]">
                  Xem hiệu quả kinh doanh <ArrowUpRight size={13} />
                </Link>
              </div>
            )}
            <button type="button" onClick={() => setHelp(true)} className="inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">
              <CircleHelp size={18} />
              {!collapsed && <span>Trợ giúp & hỗ trợ</span>}
            </button>
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="mt-1 inline-flex w-full items-center gap-2 rounded-md px-3 py-2 text-muted-foreground hover:bg-accent">
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              {!collapsed && <span>Thu gọn thanh bên</span>}
            </button>
            <div className="sidebar-meta relative mt-4 flex items-center gap-3 border-t border-border pt-5">
              <button type="button" onClick={() => setMenu((value) => !value)} className="flex w-full items-center gap-2 rounded-md px-1 py-1 hover:bg-accent">
                <span className="avatar-initials avatar-profile inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                  {initials(user.name)}
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-xs font-semibold">{user.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">{roleLabel(user.role)}</span>
                  </span>
                )}
                {!collapsed && <ChevronsUpDown size={14} className="text-muted-foreground" />}
              </button>
              {menu && (
                <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-border bg-card py-1 shadow-lg">
                  <div className="border-b border-border px-3 py-2">
                    <p className="truncate text-xs font-semibold">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{roleLabel(user.role)}</p>
                  </div>
                  <Link href="/tai-khoan" className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent" onClick={() => setMenu(false)}>
                    <UserPen size={14} /> Tài khoản của tôi
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/quan-ly/nguoi-dung" className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent" onClick={() => setMenu(false)}>
                      <ShieldCheck size={14} /> Quản lý người dùng
                    </Link>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-red-50"
                    onClick={() => {
                      logout();
                      router.replace('/login');
                    }}
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
        <div className="app-main">
          <header className="app-header">
            <button
              type="button"
              onClick={() => {
                const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                window.dispatchEvent(evt);
              }}
              className="global-search group"
            >
              <Search size={17} />
              <span className="flex-1 text-left text-sm text-muted-foreground">
                Tìm khách hàng, cơ hội, công việc...
              </span>
              <span className="search-key"><Command size={10} /> K</span>
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                title="Phím tắt (?)"
                aria-label="Phím tắt"
              >
                <CircleHelp size={18} />
              </button>
              <span className="hidden text-xs capitalize text-muted-foreground xl:block">{dateLabel}</span>
              <span className="mx-1 hidden h-5 border-l border-border sm:block" />
              <div className="relative">
                <button type="button" className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent" aria-label="Thông báo" onClick={() => { flushChime(); setBell((value) => !value); }}>
                  <Bell size={19} className={ring ? 'bell-swing' : undefined} />
                  {(overdue.some((task) => task.overdue) || overdue.some((task) => task.dueToday || task.dueTomorrow)) && (
                    <span className={overdue.some((task) => task.overdue) ? 'notification-dot' : 'notification-dot notification-dot-soon'} />
                  )}
                </button>
                {bell && (
                  <div className="notice-panel absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-sm font-semibold">Nhắc việc</p>
                      <p className="text-[11px] text-muted-foreground">Quá hạn, hôm nay và ngày mai</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto p-2">
                      {overdue.length === 0 && <p className="px-2 py-4 text-xs text-muted-foreground">Không có nhắc việc.</p>}
                      <NoticeGroup title="Quá hạn" tone="bg-red-500" tasks={overdue.filter((task) => task.overdue)} onPick={() => setBell(false)} />
                      <NoticeGroup title="Hôm nay" tone="bg-primary" tasks={overdue.filter((task) => task.dueToday)} onPick={() => setBell(false)} />
                      <NoticeGroup title="Ngày mai" tone="bg-amber-400" tasks={overdue.filter((task) => task.dueTomorrow)} onPick={() => setBell(false)} />
                    </div>
                  </div>
                )}
              </div>
              <Link href="/tai-khoan" className="inline-flex items-center gap-2 rounded-md px-1 hover:bg-accent">
                <span className="avatar-initials avatar-profile inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold">{initials(user.name)}</span>
                <ChevronDown size={13} />
              </Link>
            </div>
          </header>
          <main className={`page-content ${pathname.startsWith('/khach-hang') ? 'split-view-active' : ''}`}>
            <div className="breadcrumb">
              <span>Không gian làm việc</span>
              <ChevronRight size={12} />
              <span className="text-foreground">{label}</span>
            </div>
            {children}
          </main>
        </div>
        {help && (
          <>
            <div className="modal-backdrop" onClick={() => setHelp(false)} />
            <div className="modal-card">
              <h2 className="text-lg font-semibold">Trợ giúp & hỗ trợ</h2>
              <p className="mt-1 text-sm text-muted-foreground">B-ACE · Không gian làm việc của đội ngũ kinh doanh</p>
              <p className="mt-4 text-sm leading-7">
                Quản lý khách hàng, theo dõi cơ hội và công việc của bạn tại một nơi.
                Dữ liệu được lưu trong cơ sở dữ liệu của công ty.
              </p>
              <button type="button" onClick={() => setHelp(false)} className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Đã hiểu
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const NOTICE_SEEN = 'bace.notice.seen';
let audio: AudioContext | null = null;
let pendingChime = false;

function playChime() {
  const Context = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  if (!audio) audio = new Context();
  if (audio.state === 'suspended') {
    pendingChime = true;
    return;
  }
  const start = audio.currentTime;
  [784, 1046].forEach((freq, index) => {
    const tone = audio!.createOscillator();
    const level = audio!.createGain();
    tone.type = 'sine';
    tone.frequency.value = freq;
    const at = start + index * 0.09;
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.07, at + 0.02);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 0.38);
    tone.connect(level).connect(audio!.destination);
    tone.start(at);
    tone.stop(at + 0.4);
  });
}

function flushChime() {
  if (!pendingChime || !audio) return;
  pendingChime = false;
  audio.resume().then(playChime).catch(() => undefined);
}

function NoticeGroup({ title, tone, tasks, onPick }: { title: string; tone: string; tasks: TaskRow[]; onPick: () => void }) {
  if (!tasks.length) return null;
  return (
    <section className="mb-2">
      <p className="notice-label">
        <span className={`size-1.5 rounded-full ${tone}`} />
        {title}
        <span className="ml-auto text-[10px]">{tasks.length}</span>
      </p>
      {tasks.slice(0, 4).map((task, index) => (
        <Link key={task.id} href="/cong-viec" onClick={onPick} className="notice-item" style={{ animationDelay: `${index * 40}ms` }}>
          <span className={task.overdue ? 'notice-mark is-late' : 'notice-mark'} />
          <span className="min-w-0">
            <span className="notice-title">{task.title}</span>
            <span className="notice-meta">{task.dueDate?.slice(0, 10)} · {task.customer}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}
