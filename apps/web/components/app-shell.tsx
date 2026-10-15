'use client';

import { Loading } from '@/components/loading';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';
import {
  Bell,
  Blocks,
  CalendarDays,
  ChartNoAxesCombined,
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
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserPen,
  UsersRound,
} from 'lucide-react';
import { api, useAuth } from '@/lib/auth';
import { useRealtime } from '@/lib/realtime';
import { type TaskRow } from '@/lib/crm';
import { initials, roleLabel } from '@/lib/utils';
import { useGotoSequence } from '@/hooks/use-goto-sequence';
import { ShortcutsHelp } from '@/components/shortcuts-help';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Celebration } from '@/components/celebration';

const NAV = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/khach-hang', label: 'Khách hàng', icon: UsersRound },
  { href: '/du-an', label: 'Dự án', icon: FolderKanban },
  { href: '/co-hoi', label: 'Cơ hội', icon: Layers3 },
  { href: '/cong-viec', label: 'Công việc', icon: ListTodo },
  { href: '/lich', label: 'Lịch', icon: CalendarDays },
  { href: '/bao-cao', label: 'Báo cáo', icon: ChartNoAxesCombined },
  { href: '/tich-hop', label: 'Integration Hub', icon: Blocks },
  { href: '/cai-dat', label: 'Cài đặt', icon: Settings },
];

const CREATE_ITEMS = [
  { href: '/khach-hang', label: 'Khách hàng', icon: UsersRound },
  { href: '/co-hoi', label: 'Cơ hội', icon: Layers3 },
  { href: '/cong-viec', label: 'Công việc', icon: ListTodo },
];

// Mở command palette (giống bấm Cmd/Ctrl + K)
function openSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, session, logout } = useAuth();
  const { on, connected } = useRealtime();

  const [collapsed, setCollapsed] = useState(false);
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const [create, setCreate] = useState(false);
  const [help, setHelp] = useState(false);
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [ring, setRing] = useState(false);
  const [overdue, setOverdue] = useState<TaskRow[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [celebration, setCelebration] = useState<{
    dealName: string;
    value?: number;
    owner?: string;
    at: string;
  } | null>(null);

  // Tự động collapse khi màn hình nhỏ
  useEffect(() => {
    setCollapsed(isNarrow);
  }, [isNarrow]);

  // Phím tắt G → X
  useGotoSequence(
    {
      h: '/',
      c: '/khach-hang',
      d: '/du-an',
      o: '/co-hoi',
      t: '/cong-viec',
      l: '/lich',
      r: '/bao-cao',
      i: '/tich-hop',
      s: '/cai-dat',
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

      // `/` mở tìm kiếm
      if (event.key === '/' && !inInput) {
        event.preventDefault();
        openSearch();
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

  // Realtime: cập nhật chuông khi có task mới/cập nhật
  useEffect(() => {
    if (!session) return;

    const refresh = () => {
      api<TaskRow[]>('/tasks')
        .then((rows) => {
          const next = rows.filter((row) => row.overdue || row.dueToday || row.dueTomorrow);
          setOverdue(next);

          const signature = next.map((row) => row.id).sort().join(',');
          const seen = sessionStorage.getItem(NOTICE_SEEN);
          if (signature && seen !== signature) {
            sessionStorage.setItem(NOTICE_SEEN, signature);
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

  // Celebration khi deal chốt thắng hoặc báo giá được chấp nhận
  useEffect(() => {
    if (!session) return;
    const unsub1 = on('deal:stage-changed', (event) => {
      if (event.payload?.status !== 'won') return;
      setCelebration({
        dealName: event.payload.name,
        value: event.payload.value,
        owner: event.payload.owner,
        at: event.at,
      });
    });
    const unsub2 = on('quote:accepted', (event) => {
      setCelebration({
        dealName: `Báo giá ${event.payload?.quoteNumber || ''}`,
        value: event.payload?.price,
        owner: event.payload?.title,
        at: event.at,
      });
    });
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
    if (pathname.startsWith('/quan-ly')) return 'Quản lý';
    if (pathname.startsWith('/tai-khoan')) return 'Tài khoản của tôi';
    if (pathname.startsWith('/tim-kiem')) return 'Tìm kiếm';
    if (pathname.startsWith('/tich-hop')) return 'Integration Hub';
    if (pathname.startsWith('/cai-dat')) return 'Cài đặt';
    return 'Tổng quan';
  }, [pathname]);

  if (!ready || !session) {
    return <Loading text="Đang mở không gian làm việc" fullscreen />;
  }

  const user = session.user;
  // Quản lý người dùng đã chuyển vào Cài đặt -> không còn mục riêng trên sidebar
  const items = NAV;
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
      <Celebration
        open={!!celebration}
        data={celebration}
        onClose={() => setCelebration(null)}
      />
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
                    <Link href="/cai-dat?tab=users" className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent" onClick={() => setMenu(false)}>
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
            {/* Trái: breadcrumb */}
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 shrink-0 items-center gap-1.5 text-xs text-muted-foreground lg:flex"
            >
              <span className="truncate">Không gian làm việc</span>
              <ChevronRight size={12} />
              <span className="truncate font-semibold text-foreground">{label}</span>
            </nav>

            {/* Giữa: tìm kiếm */}
            <div className="flex min-w-0 flex-1 justify-center px-2">
              <button
                type="button"
                onClick={openSearch}
                className="global-search group w-full max-w-lg"
              >
                <Search size={17} />
                <span className="flex-1 truncate text-left text-sm text-muted-foreground">
                  Tìm khách hàng, cơ hội, công việc...
                </span>
                <span className="search-key"><Command size={10} /> K</span>
              </button>
            </div>

            {/* Phải: hành động */}
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Tạo mới */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCreate((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={create}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Tạo mới</span>
                </button>
                {create && (
                  <>
                    <button
                      type="button"
                      aria-label="Đóng menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setCreate(false)}
                    />
                    <div
                      role="menu"
                      className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-card py-1 shadow-lg"
                    >
                      <p className="px-3 py-2 text-[11px] font-medium text-muted-foreground">Tạo nhanh</p>
                      {CREATE_ITEMS.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            role="menuitem"
                            onClick={() => setCreate(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent"
                          >
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
              <span
                title={connected ? 'Đang cập nhật trực tiếp' : 'Mất kết nối, dữ liệu không tự cập nhật'}
                className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground md:inline-flex"
              >
                <span className={`size-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
                {connected ? 'Trực tiếp' : 'Ngoại tuyến'}
              </span>

              {/* Ngày -> mở lịch */}
              <Link
                href="/lich"
                className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-xs capitalize text-muted-foreground hover:bg-accent xl:inline-flex"
              >
                <CalendarDays size={14} />
                {dateLabel}
              </Link>

              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                title="Phím tắt (?)"
                aria-label="Phím tắt"
              >
                <CircleHelp size={18} />
              </button>

              {/* Chuông */}
              <div className="relative">
                <button
                  type="button"
                  className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
                  aria-label="Thông báo"
                  onClick={() => {
                    flushChime();
                    setBell((value) => !value);
                  }}
                >
                  <Bell size={19} className={ring ? 'bell-swing' : undefined} />
                  {overdue.length > 0 && (
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

              <span className="mx-1 hidden h-6 border-l border-border sm:block" />

              {/* Người dùng */}
              <Link
                href="/tai-khoan"
                className="flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-2 hover:bg-accent"
              >
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
          <main className={`page-content ${pathname.startsWith('/khach-hang') ? 'split-view-active' : ''}`}>
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