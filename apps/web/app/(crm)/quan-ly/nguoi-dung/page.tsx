'use client';

import { FormEvent, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { api } from '@/lib/auth';
import { initials, roleLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  status: string;
  createdAt: string;
};

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nextRole, setNextRole] = useState('sales');

  function load() {
    return api<UserRow[]>('/users').then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  const visible = rows.filter((row) => {
    const blob = `${row.name} ${row.email}`.toLowerCase();
    return blob.includes(search.toLowerCase()) && (!role || row.role === role);
  });

  async function addUser(event: FormEvent) {
    event.preventDefault();
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role: nextRole, password: 'password' }),
    });
    setOpen(false);
    setName('');
    setEmail('');
    await load();
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Người dùng</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Quản lý tài khoản và phân quyền hệ thống. Mật khẩu mặc định là password.</p>
        </div>
        <Button onClick={() => setOpen(true)}><UserPlus size={16} /> Thêm người dùng</Button>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <div className="mb-5 flex flex-wrap gap-3">
        <Input className="max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên, email..." />
        <select className="crm-select" value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="admin">Quản trị viên</option>
          <option value="manager">Quản lý</option>
          <option value="sales">Sales</option>
        </select>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">{rows.length} người dùng</span>
        <span className="rounded-full bg-green-100 px-3 py-1 text-green-700">{rows.filter((row) => row.status === 'active').length} đang hoạt động</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 text-left font-medium">Người dùng</th>
              <th className="px-4 py-3 text-left font-medium">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium">Điện thoại</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((user, index) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`avatar-initials avatar-tone-${index % 4} inline-flex size-8 items-center justify-center rounded-full text-xs font-semibold`}>{initials(user.name)}</span>
                    <span>
                      <span className="block font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3"><span className={user.role === 'admin' ? 'status-badge status-red' : user.role === 'manager' ? 'status-badge status-blue' : 'status-badge status-success'}>{roleLabel(user.role)}</span></td>
                <td className="px-4 py-3">{user.phone || '—'}</td>
                <td className="px-4 py-3"><span className={user.status === 'active' ? 'status-badge status-success' : 'status-badge status-warning'}>{user.status === 'active' ? 'Hoạt động' : 'Khoá'}</span></td>
                <td className="px-4 py-3 text-muted-foreground">{String(user.createdAt).slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form
            className="modal-card"
            onSubmit={(event) =>
              addUser(event).catch((err: Error) => setError(err.message))
            }
          >
            <h2 className="text-lg font-semibold">Thêm người dùng</h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Nhập thông tin tài khoản và phân quyền sử dụng CRM.
            </p>

            <div className="mt-4 grid gap-4">
              {/* Họ và tên */}
              <div className="grid gap-1.5">
                <label htmlFor="new-user-name" className="text-sm font-medium">
                  Họ và tên <span className="text-destructive">*</span>
                </label>

                <Input
                  id="new-user-name"
                  required
                  placeholder="Nhập họ và tên"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              {/* Email */}
              <div className="grid gap-1.5">
                <label htmlFor="new-user-email" className="text-sm font-medium">
                  Email <span className="text-destructive">*</span>
                </label>

                <Input
                  id="new-user-email"
                  required
                  type="email"
                  placeholder="example@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <p className="text-xs text-muted-foreground">
                  Sử dụng email hợp lệ của người dùng.
                </p>
              </div>

              {/* Vai trò */}
              <div className="grid gap-1.5">
                <label htmlFor="new-user-role" className="text-sm font-medium">
                  Vai trò <span className="text-destructive">*</span>
                </label>

                <select
                  id="new-user-role"
                  className="crm-select"
                  value={nextRole}
                  onChange={(event) => setNextRole(event.target.value)}
                  required
                >
                  <option value="sales">Sales</option>
                  <option value="manager">Quản lý</option>
                  <option value="admin">Quản trị viên</option>
                </select>

                <p className="text-xs text-muted-foreground">
                  Vai trò quyết định quyền truy cập và thao tác trong hệ thống.
                </p>
              </div>

              {/* Nút thao tác */}
              <div className="mt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </Button>

                <Button type="submit">
                  Tạo người dùng
                </Button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
