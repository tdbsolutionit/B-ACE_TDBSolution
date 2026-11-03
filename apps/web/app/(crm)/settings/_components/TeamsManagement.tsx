'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Plus, Users, Trash2, Pencil, Building2 } from 'lucide-react';

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  members: Array<{ id: string; name: string; email: string }>;
  _count: { users: number };
};

export function TeamsManagement() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [form, setForm] = useState({ name: '', description: '' });

  function load() {
    setLoading(true);
    api<TeamRow[]>('/teams')
      .then((res) => setTeams(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ name: '', description: '' });
    setOpen(true);
  }

  function openEdit(team: TeamRow) {
    setEditingId(team.id);
    setForm({ name: team.name, description: team.description || '' });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await api(`/teams/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        toast.success('Đã cập nhật phòng ban');
      } else {
        await api('/teams', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        toast.success('Đã tạo phòng ban mới');
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu phòng ban');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api(`/teams/${deleteId}`, { method: 'DELETE' });
      toast.success('Đã xóa phòng ban');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa phòng ban');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Phòng ban & Nhân viên</h2>
          <p className="mt-1 text-xs text-muted-foreground">Quản lý cơ cấu tổ chức và phân chia nhân sự theo phòng ban.</p>
        </div>
        <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus size={16} /> Thêm phòng ban
        </button>
      </div>

      <section className="data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải danh sách phòng ban...</div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Building2 size={40} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium">Chưa có phòng ban nào</p>
            <p className="mt-1 text-xs text-muted-foreground">Bấm nút Thêm phòng ban để tạo cơ cấu tổ chức đầu tiên.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Tên phòng ban</th>
                <th className="px-4 py-3 font-semibold">Mô tả</th>
                <th className="px-4 py-3 font-semibold text-center">Số nhân viên</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{team.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{team.description || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      <Users size={12} /> {team._count.users}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(team)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => setDeleteId(team.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editingId ? 'Sửa phòng ban' : 'Tạo phòng ban mới'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Tên phòng ban <span className="text-destructive">*</span></label>
            <input 
              required 
              value={form.name} 
              onChange={(e) => setForm({ ...form, name: e.target.value })} 
              placeholder="VD: Phòng Kinh doanh, Phòng Kỹ thuật..." 
              className="h-10 rounded-md border border-input px-3 text-sm focus:border-primary outline-none" 
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Mô tả</label>
            <textarea 
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
              placeholder="Mô tả chức năng nhiệm vụ..." 
              className="min-h-[80px] rounded-md border border-input p-3 text-sm focus:border-primary outline-none" 
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm hover:bg-accent">Hủy</button>
            <SubmitButton isSaving={saving} label="Lưu phòng ban" />
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={handleDelete} 
        title="Xóa Phòng ban" 
        description="Bạn có chắc chắn muốn xóa phòng ban này? Các nhân viên thuộc phòng ban sẽ được chuyển về trạng thái 'Chưa xếp phòng'." 
      />
    </div>
  );
}