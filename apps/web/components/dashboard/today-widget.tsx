'use client';

import Link from 'next/link';
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, Clock } from 'lucide-react';

type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: string;
  time: string;
  customer: string;
  overdue?: boolean;
  dueToday?: boolean;
};

type Props = {
  tasks: Task[];
  onToggle: (task: Task) => void;
};

export function TodayWidget({ tasks, onToggle }: Props) {
  const open = tasks.filter((t) => !t.done);
  const overdue = open.filter((t) => t.overdue);
  const today = open.filter((t) => t.dueToday && !t.overdue);

  // Nếu không có flag overdue/dueToday → fallback lấy 5 task chưa xong đầu tiên
  const fallback = !overdue.length && !today.length ? open.slice(0, 5) : [];
  const display = [...overdue, ...today, ...fallback].slice(0, 6);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Clock size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Cần làm hôm nay</h2>
            <p className="text-[10px] text-muted-foreground">
              {overdue.length > 0 && (
                <span className="text-destructive">{overdue.length} quá hạn</span>
              )}
              {overdue.length > 0 && today.length > 0 && ' · '}
              {today.length > 0 && <span>{today.length} đến hạn</span>}
              {!overdue.length && !today.length && `${open.length} việc chưa xong`}
            </p>
          </div>
        </div>
        <Link
          href="/cong-viec"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Xem tất cả <ArrowRight size={11} />
        </Link>
      </header>

      {display.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <CheckCircle2 size={22} className="text-green-500" />
          <p className="text-xs font-medium">Hôm nay bạn đã hết việc!</p>
          <p className="text-[10px] text-muted-foreground">Nghỉ ngơi hoặc tìm cơ hội mới</p>
        </div>
      )}

      <ul className="space-y-1">
        {display.map((task) => {
          const isOverdue = task.overdue;
          return (
            <li
              key={task.id}
              className={`group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50 ${
                isOverdue ? 'bg-destructive/5' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(task)}
                className="flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background transition-colors hover:border-primary"
                aria-label="Đánh dấu hoàn thành"
              >
                <CheckCircle2 size={11} className="text-muted-foreground opacity-0 group-hover:opacity-100" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{task.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  {isOverdue ? (
                    <>
                      <AlertCircle size={9} className="text-destructive" />
                      <span className="text-destructive">Quá hạn</span>
                    </>
                  ) : (
                    <>
                      <Calendar size={9} />
                      <span>{task.time || 'Hôm nay'}</span>
                    </>
                  )}
                  <span className="mx-0.5">·</span>
                  <span className="truncate">{task.customer}</span>
                </p>
              </div>
              {task.priority === 'Cao' && (
                <span className="shrink-0 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-red-700">
                  Cao
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
