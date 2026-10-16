'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

export function SecuritySection() {
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submitPwd(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (pwd.next.length < 6) {
      setError('Mật khẩu mới tối thiểu 6 ký tự');
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    if (pwd.current === pwd.next) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setSaving(true);
    try {
      await api('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.next,
        }),
      });
      toast.success('Đổi mật khẩu thành công');
      setPwd({ current: '', next: '', confirm: '' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Đổi mật khẩu thất bại';
      // NestJS thường trả về { message: string } -> parse ra
      try {
        const body = JSON.parse(msg) as { message?: string | string[] };
        const m = Array.isArray(body.message) ? body.message[0] : body.message;
        setError(m || msg);
      } catch {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-[17px] font-semibold text-slate-900">Đổi mật khẩu</h2>
        <p className="mb-5 mt-1 text-[13px] text-slate-500">
          Nên sử dụng mật khẩu mạnh, tối thiểu 8 ký tự, gồm chữ, số và ký tự đặc biệt.
        </p>

        <form onSubmit={submitPwd} className="grid max-w-lg gap-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">
              Mật khẩu hiện tại
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={pwd.current}
              onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">
              Mật khẩu mới
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-900">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={saving}
              className="h-11 rounded-lg bg-[#0B6E78] px-5 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Đổi mật khẩu'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}