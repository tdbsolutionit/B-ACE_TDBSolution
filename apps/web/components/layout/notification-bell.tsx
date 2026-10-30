'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { type TaskRow } from '@/lib/crm';
import { flushChime, playChime } from './audio';

const NOTICE_SEEN = 'bace.notice.seen';

export function NotificationBell({ on }: { on: (event: string, cb: (data: any) => void) => () => void }) {
  const [bell, setBell] = useState(false);
  const [ring, setRing] = useState(false);
  const [overdue, setOverdue] = useState<TaskRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    const refresh = () => {
      api<TaskRow[]>('/tasks').then((rows) => {
        if (!isMounted) return;
        
        // Đảm bảo rows là mảng để không bị lỗi filter
        const safeRows = Array.isArray(rows) ? rows : [];
        const next = safeRows.filter((row) => row.overdue || row.dueToday || row.dueTomorrow);
        
        setOverdue(next);
        const signature = next.map((row) => row.id).sort().join(',');
        const seen = sessionStorage.getItem(NOTICE_SEEN);
        if (signature && seen !== signature) {
          sessionStorage.setItem(NOTICE_SEEN, signature);
          setRing(true);
          window.setTimeout(() => setRing(false), 1800);
          playChime();
        }
      }).catch(() => {});
    };

    refresh();
    const unsub1 = on('task:created', refresh);
    const unsub2 = on('task:updated', refresh);
    
    return () => { 
      isMounted = false; // Dọn dẹp
      unsub1(); 
      unsub2(); 
    };
  }, [on]);

  return (
    <div className="relative">
      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
        aria-label="Thông báo"
        onClick={() => { flushChime(); setBell((v) => !v); }}
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
            <NoticeGroup title="Quá hạn" tone="bg-red-500" tasks={overdue.filter((t) => t.overdue)} onPick={() => setBell(false)} />
            <NoticeGroup title="Hôm nay" tone="bg-primary" tasks={overdue.filter((t) => t.dueToday)} onPick={() => setBell(false)} />
            <NoticeGroup title="Ngày mai" tone="bg-amber-400" tasks={overdue.filter((t) => t.dueTomorrow)} onPick={() => setBell(false)} />
          </div>
        </div>
      )}
    </div>
  );
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
        <Link key={task.id} href="/tasks" onClick={onPick} className="notice-item" style={{ animationDelay: `${index * 40}ms` }}>
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