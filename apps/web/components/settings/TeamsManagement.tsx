'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/auth';

type Member = { id: string; name: string; email: string };
type Team = {
  id: string;
  name: string;
  description?: string | null;
  members: Member[];
  _count?: { users: number };
};

const AVATAR_COLORS = ['#0B6E78', '#C9A961', '#8B5CF6', '#EF4444', '#F59E0B', '#10B981'];

function getInitials(name: string) {
  return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase();
}

export function TeamsManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<Team[]>('/teams');
      setTeams(data);
    } catch (e) {
      setError('Không tải được danh sách team.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '' });
    setShowForm(true);
  };

  const startEdit = (t: Team) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description ?? '' });
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await api<Team>(`/teams/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(form),
        });
        setTeams((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...updated } : t)));
      } else {
        const created = await api<Team>('/teams', {
          method: 'POST',
          body: JSON.stringify(form),
        });
        setTeams((prev) => [...prev, { ...created, members: created.members ?? [] }]);
      }
      setShowForm(false);
    } catch (err) {
      alert('Lưu team thất bại. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa team này? Thành viên sẽ được chuyển về "chưa có team".')) return;
    try {
      await api(`/teams/${id}`, { method: 'DELETE' });
      setTeams((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert('Xóa team thất bại.');
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Đang tải danh sách team…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">{error}</p>
        <button
          onClick={load}
          className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-slate-900">Quản lý Team</h2>
          <p className="mt-1 text-[13px] text-slate-500">
            Chia nhân viên thành các nhóm để dễ dàng phân chia dữ liệu và báo cáo.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="h-10 rounded-lg bg-[#0B6E78] px-4 text-sm font-semibold text-white hover:bg-[#095a63]"
        >
          + Tạo Team mới
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Tên Team</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Team Sales Miền Bắc"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">Mô tả</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả ngắn về team"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-lg bg-[#0B6E78] px-4 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : editing ? 'Cập nhật' : 'Tạo Team'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-12 text-center">
          <p className="text-sm text-slate-500">Chưa có team nào. Bấm "+ Tạo Team mới" để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {teams.map((team) => {
            const memberCount = team._count?.users ?? team.members.length;
            return (
              <div key={team.id} className="rounded-lg border border-slate-200 p-4 hover:border-[#0B6E78]/40 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">{team.name}</h3>
                    {team.description && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{team.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-[#0B6E78]/10 px-2.5 py-1 text-[12px] font-semibold text-[#0B6E78]">
                    {memberCount} thành viên
                  </span>
                </div>

                <div className="mt-3 flex -space-x-2">
                  {team.members.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {getInitials(m.name)}
                    </div>
                  ))}
                  {memberCount > 5 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[11px] font-semibold text-slate-600">
                      +{memberCount - 5}
                    </div>
                  )}
                  {memberCount === 0 && (
                    <span className="text-[13px] italic text-slate-400">Chưa có thành viên</span>
                  )}
                </div>

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => startEdit(team)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(team.id)}
                    className="ml-auto rounded-md border border-red-200 px-3 py-1.5 text-[13px] font-medium text-red-600 hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}