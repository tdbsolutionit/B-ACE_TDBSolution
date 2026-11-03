'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { type TaskRow } from '@/lib/crm';
import { useRealtime } from '@/lib/realtime';
import { CustomerSelect } from '@/components/shared/customer-select';
import { UserSelect } from '@/components/shared/user-select';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { Modal } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';
import { PriorityBadge } from '@/components/shared/badges';
import { ClipboardList, Plus, Pencil } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editTask, setEditTask] = useState<TaskRow | null>(null);
  const { on } = useRealtime();

  function load() {
    return api<TaskRow[]>('/tasks').then(setTasks);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    const unsub1 = on('task:created', () => load().catch(() => {}));
    const unsub2 = on('task:updated', () => load().catch(() => {}));
    return () => { unsub1(); unsub2(); };
  }, [on]);

  async function toggle(task: TaskRow) {
    await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: task.done ? 'pending' : 'done' }) });
    await load();
  }

  function openCreate() {
    setEditTask(null);
    setOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditTask(task);
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const customerId = String(data.get('customerId') || '');

    setSaving(true);
    try {
      const payload = {
        title: String(data.get('title') || ''),
        dueDate: String(data.get('dueDate') || ''),
        priority: String(data.get('priority') || 'medium'),
        assignedTo: String(data.get('assignedTo') || '') || undefined,
        relatedType: customerId ? 'customer' : undefined,
        relatedId: customerId || undefined,
      };

      if (editTask) {
        await api(`/tasks/${editTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Đã cập nhật công việc');
      } else {
        await api('/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Đã thêm công việc');
      }
      setOpen(false);
      form.reset();
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader 
        title="Công việc" 
        description="Việc cần làm với khách hàng và nội bộ."
        action={
          <button type="button" onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus size={16} /> Thêm việc
          </button>
        }
      />
      
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      
      <section className="data-panel">
        {tasks.length === 0 ? (
          <EmptyState 
            icon={<ClipboardList size={40} />} 
            title="Chưa có công việc nào" 
            description="Bấm nút Thêm việc để tạo công việc đầu tiên." 
          />
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="task-row group">
              <input type="checkbox" className="task-check" checked={task.done} onChange={() => toggle(task).catch((err: Error) => setError(err.message))} />
              <div className="min-w-0 flex-1">
                <p className={task.done ? 'text-[13px] font-medium text-muted-foreground line-through' : 'text-[13px] font-medium'}>{task.title}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{task.customer}{task.assigneeName ? ` · ${task.assigneeName}` : ''}</p>
              </div>
              <PriorityBadge priority={task.priority} />
              <span className="text-[11px] text-muted-foreground mr-2">{task.dueDate ? task.dueDate.slice(0, 10) : ''}{task.overdue ? ' · Quá hạn' : task.dueToday ? ' · Hôm nay' : task.dueTomorrow ? ' · Ngày mai' : ''}</span>
              <button 
                type="button" 
                onClick={() => openEdit(task)} 
                className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-primary transition-all rounded"
                title="Sửa công việc"
              >
                <Pencil size={14} />
              </button>
            </div>
          ))
        )}
      </section>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editTask ? "Sửa công việc" : "Thêm công việc"}>
        <form key={editTask?.id || 'new'} onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Nội dung công việc <span className="text-destructive">*</span></label>
              <input name="title" defaultValue={editTask?.title} required className="h-10 w-full rounded-md border border-input px-3 text-sm" placeholder="VD: Gọi điện chăm sóc khách hàng" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Hạn chót</label>
              <input name="dueDate" type="date" defaultValue={editTask?.dueDate?.slice(0, 10)} required className="h-10 w-full rounded-md border border-input px-3 text-sm" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Mức độ ưu tiên</label>
              <select name="priority" className="crm-select h-10 w-full" defaultValue={editTask?.priority || 'medium'}>
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Người đảm nhận</label>
              <UserSelect name="assignedTo" defaultValue={editTask?.assignedTo || ''} defaultLabel="-- Người đang đăng nhập --" />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Liên kết khách hàng</label>
              <CustomerSelect name="customerId" defaultValue={editTask?.relatedId || ''} defaultLabel="-- Nội bộ (Không chọn KH) --" />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm hover:bg-accent">Hủy</button>
            <SubmitButton isSaving={saving} label={editTask ? "Lưu thay đổi" : "Lưu công việc"} />
          </div>
        </form>
      </Modal>
    </>
  );
}