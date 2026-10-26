'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { type TaskRow } from '@/lib/crm';

const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function CalendarPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: start + days }, (_, index) => (index < start ? null : index - start + 1));
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  useEffect(() => {
    api<TaskRow[]>('/tasks').then(setTasks).catch(() => setTasks([]));
  }, []);

  const events: Record<number, string[]> = {};
  for (const task of tasks) {
    if (!task.dueDate) continue;
    const date = new Date(task.dueDate);
    if (date.getFullYear() !== year || date.getMonth() !== month) continue;
    const day = date.getDate();
    events[day] = [...(events[day] || []), task.title];
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-[28px] font-bold">Lịch</h1>
        <p className="mt-1.5 text-sm text-muted-foreground capitalize">
          {new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(now)} · việc theo hạn trong tháng
        </p>
      </div>
      <section className="data-panel overflow-hidden p-0">
        <div className="calendar-grid border-b border-border bg-background text-center text-[11px] text-muted-foreground">
          {WEEK.map((day) => <div key={day} className="py-2">{day}</div>)}
        </div>
        <div className="calendar-grid">
          {cells.map((day, index) => (
            <div key={index} className="calendar-cell">
              {day && <span className={day === now.getDate() ? 'text-xs font-semibold text-primary' : 'text-xs'}>{day}</span>}
              {day && events[day]?.map((title) => <span key={title} className="calendar-event">{title}</span>)}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
