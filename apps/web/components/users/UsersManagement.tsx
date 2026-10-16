'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, useAuth } from '@/lib/auth';
import { initials, roleLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/lib/use-permission';

/* ---------- Types ---------- */

type LegacyRole = 'admin' | 'manager' | 'sales';
type UserStatus = 'active' | 'inactive';

type RoleOption = {
  id: string;
  name: string;
  isSystem: boolean;
};

type TeamOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: LegacyRole;
  roleId: string | null;
  teamId: string | null;
  roleRef: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  phone: string | null;
  status: UserStatus;
  createdAt: string;
};

type UserForm = {
  name: string;
  email: string;
  phone: string;
  roleId: string;
  teamId: string;
  status: UserStatus;
  password: string;
};

const EMPTY_FORM: UserForm = {
  name: '',
  email: '',
  phone: '',
  roleId: '',
  teamId: '',
  status: 'active',
  password: '',
};

const STATUS_LABEL: Record<UserStatus, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
};

const selectCls =
  'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/* ---------- Helpers ---------- */

function errorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;

  let raw: string[] = [err.message];
  try {
    const body = JSON.parse(err.message) as { message?: string | string[] };
    if (body.message) raw = Array.isArray(body.message) ? body.message : [body.message];
  } catch {
    /* message không phải JSON, giữ nguyên */
  }

  const out = raw.map((m) => {
    if (/email must be an email/.test(m)) return 'Email không hợp lệ';
    if (/password must be longer/.test(m)) return 'Mật khẩu tối thiểu 6 ký tự';
    if (/name must be a string/.test(m)) return 'Vui lòng nhập họ tên';
    if (/Unique constraint/i.test(m)) return 'Email này đã được sử dụng';
    return m;
  });

  return Array.from(new Set(out)).join('. ') || fallback;
}

/* ---------- Component ---------- */

export function UsersManagement() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const [u, r, t] = await Promise.all([
        api<UserRow[]>('/users'),
        api<RoleOption[]>('/roles'),
        api<TeamOption[]>('/teams'),
      ]);
      setUsers(u);
      setRoles(r);
      setTeams(t);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được dữ liệu.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditingId(null);
    // Mặc định chọn role đầu tiên không phải hệ thống, nếu không có thì chọn role đầu
    const defaultRole =
      roles.find((r) => !r.isSystem)?.id ?? roles[0]?.id ?? '';
    setForm({ ...EMPTY_FORM, roleId: defaultRole });
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function openEdit(u: UserRow) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone ?? '',
      roleId: u.roleId ?? u.roleRef?.id ?? '',
      teamId: u.teamId ?? '',
      status: u.status,
      password: '',
    });
    setError('');
    setNotice('');
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
  }

  const setField = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!editingId && form.password.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự');
      return;
    }

    if (!form.roleId) {
      setError('Vui lòng chọn vai trò');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        roleId: form.roleId,
        teamId: form.teamId || null,
        status: form.status,
        ...(form.password ? { password: form.password } : {}),
      };

      await api(editingId ? `/users/${editingId}` : '/users', {
        method: editingId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });

      setNotice(editingId ? 'Đã cập nhật người dùng' : 'Đã thêm người dùng');
      closeForm();
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Không lưu được người dùng. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: UserRow) {
    if (!window.confirm(`Xóa người dùng "${u.name}"? Thao tác này không thể hoàn tác.`)) return;
    setError('');
    setNotice('');
    try {
      await api(`/users/${u.id}`, { method: 'DELETE' });
      setNotice('Đã xóa người dùng');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Không xóa được người dùng.'));
    }
  }

  // Hiển thị tên vai trò: ưu tiên roleRef.name, fallback roleLabel
  function displayRole(u: UserRow): string {
    return u.roleRef?.name ?? roleLabel(u.role);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold">Người dùng & phân quyền</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isAdmin
              ? 'Thêm thành viên và phân vai trò truy cập.'
              : 'Chỉ quản trị viên mới thêm, sửa hoặc xóa được người dùng.'}
          </p>
        </div>
        {isAdmin && !formOpen && <Button onClick={openCreate}>Thêm người dùng</Button>}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-success">
          {notice}
        </p>
      )}

      {formOpen && (
        <form onSubmit={submit} className="data-panel">
          <h3 className="mb-4 text-sm font-semibold">
            {editingId ? 'Sửa người dùng' : 'Thêm người dùng'}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">
              Họ tên
              <Input className="mt-1" required value={form.name}
                onChange={(e) => setField('name', e.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Email
              <Input className="mt-1" type="email" required value={form.email}
                onChange={(e) => setField('email', e.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Điện thoại
              <Input className="mt-1" value={form.phone}
                onChange={(e) => setField('phone', e.target.value)} />
            </label>
            <label className="text-xs font-medium">
              {editingId ? 'Mật khẩu mới' : 'Mật khẩu'}
              <Input className="mt-1" type="password" value={form.password}
                placeholder={editingId ? 'Để trống nếu không đổi' : 'Tối thiểu 6 ký tự'}
                onChange={(e) => setField('password', e.target.value)} />
            </label>
            <label className="text-xs font-medium">
              Vai trò
              <select className={selectCls} value={form.roleId} required
                onChange={(e) => setField('roleId', e.target.value)}>
                <option value="" disabled>-- Chọn vai trò --</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Team
              <select className={selectCls} value={form.teamId}
                onChange={(e) => setField('teamId', e.target.value)}>
                <option value="">-- Không thuộc team nào --</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Trạng thái
              <select className={selectCls} value={form.status}
                onChange={(e) => setField('status', e.target.value as UserStatus)}>
                <option value="active">{STATUS_LABEL.active}</option>
                <option value="inactive">{STATUS_LABEL.inactive}</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Thêm người dùng'}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              Hủy
            </Button>
          </div>
        </form>
      )}

      <section className="data-panel overflow-x-auto">
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có người dùng nào. Bấm &quot;Thêm người dùng&quot; để mời thành viên đầu tiên.
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Người dùng</th>
                <th className="py-2 pr-3 font-medium">Vai trò</th>
                <th className="py-2 pr-3 font-medium">Team</th>
                <th className="py-2 pr-3 font-medium">Điện thoại</th>
                <th className="py-2 pr-3 font-medium">Trạng thái</th>
                {isAdmin && <th className="py-2 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.email === session?.user.email;
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="avatar-initials inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold">
                          {initials(u.name)}
                        </span>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium">
                        {displayRole(u)}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {u.team?.name ?? (
                        <span className="text-xs italic text-muted-foreground">Chưa xếp</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">{u.phone || '—'}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABEL[u.status]}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => openEdit(u)}>
                            Sửa
                          </Button>
                          {!isSelf && (
                            <Button type="button" variant="outline" size="sm"
                              className="text-destructive" onClick={() => remove(u)}>
                              Xóa
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}