'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { type CustomerRow, type TaskRow } from '@/lib/crm';
import { useRealtime } from '@/lib/realtime';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { on } = useRealtime();

  function load() {
    return api<TaskRow[]>('/tasks').then(setTasks);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<Array<{ id: string; name: string }>>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

    // Realtime: tự động reload khi có task mới/cập nhật
  useEffect(() => {
    const unsub1 = on('task:created', () => {
      load().catch(() => {});
    });
    const unsub2 = on('task:updated', () => {
      load().catch(() => {});
    });
    return () => {
      unsub1();
      unsub2();
    };
  }, [on]);

  async function toggle(task: TaskRow) {
    await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: task.done ? 'pending' : 'done' }) });
    await load();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const customerId = String(data.get('customerId') || '');
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({
        title: String(data.get('title') || ''),
        dueDate: String(data.get('dueDate') || ''),
        priority: String(data.get('priority') || 'medium'),
        assignedTo: String(data.get('assignedTo') || '') || undefined,
        relatedType: customerId ? 'customer' : undefined,
        relatedId: customerId || undefined,
      }),
    });
    setOpen(false);
    await load();
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Công việc</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Việc cần làm với khách hàng và nội bộ.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Thêm việc</button>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <section className="data-panel">
        {tasks.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Chưa có công việc.</p>}
        {tasks.map((task) => (
          <div key={task.id} className="task-row">
            <input type="checkbox" className="task-check" checked={task.done} onChange={() => toggle(task).catch((err: Error) => setError(err.message))} />
            <div className="min-w-0 flex-1">
              <p className={task.done ? 'text-[13px] font-medium text-muted-foreground line-through' : 'text-[13px] font-medium'}>{task.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{task.customer}{task.assigneeName ? ` · ${task.assigneeName}` : ''}</p>
            </div>
            <span className={`priority-badge ${task.priority === 'high' ? 'priority-high' : task.priority === 'low' ? 'priority-low' : 'priority-medium'}`}>{task.priorityLabel}</span>
            <span className="text-[11px] text-muted-foreground">{task.dueDate ? task.dueDate.slice(0, 10) : ''}{task.overdue ? ' · Quá hạn' : task.dueToday ? ' · Hôm nay' : task.dueTomorrow ? ' · Ngày mai' : ''}</span>
          </div>
        ))}
      </section>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={(event) => create(event).catch((err: Error) => setError(err.message))}>
            <h2 className="text-base font-semibold">Thêm công việc</h2>
            <div className="mt-4 grid gap-3">
              <input name="title" required className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Nội dung" />
              <input name="dueDate" type="date" required className="h-10 rounded-md border border-input px-3 text-sm" />
              <select name="priority" className="crm-select">
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
              <select name="assignedTo" className="crm-select">
                <option value="">Người đang đăng nhập</option>
                {users.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <select name="customerId" className="crm-select">
                <option value="">Nội bộ</option>
                {customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
