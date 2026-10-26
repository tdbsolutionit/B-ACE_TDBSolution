'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, useAuth } from '@/lib/auth';
import { initials, roleLabel } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRealtime } from '@/lib/realtime';
import { Bell } from 'lucide-react';

export default function ProfilePage() {
  const { session } = useAuth();
  const [name, setName] = useState(session?.user.name || '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { toastEnabled, setToastEnabled, connected } = useRealtime();

  useEffect(() => {
    api<{ name: string; phone: string | null }>('/auth/me')
      .then((me) => {
        setName(me.name);
        setPhone(me.phone || '');
      })
      .catch(() => undefined);
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    await api('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ name, phone, ...(password ? { password } : {}) }),
    });
    setPassword('');
    setSaved(true);
  }

  if (!session) return null;

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">Tài khoản của tôi</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Cập nhật thông tin đăng nhập nội bộ.</p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <form onSubmit={(event) => save(event).catch((err: Error) => setError(err.message))} className="data-panel mt-6 max-w-xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="avatar-initials avatar-profile inline-flex size-12 items-center justify-center rounded-full font-semibold">{initials(name || session.user.name)}</span>
          <div>
            <p className="font-semibold">{session.user.email}</p>
            <p className="text-xs text-muted-foreground">{roleLabel(session.user.role)}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <label className="text-xs font-medium">Họ tên<Input className="mt-1" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="text-xs font-medium">Điện thoại<Input className="mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label className="text-xs font-medium">Mật khẩu mới<Input className="mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Để trống nếu không đổi" /></label>
        </div>
        <Button className="mt-4" type="submit">Cập nhật</Button>
        {saved && <p className="mt-3 text-sm text-success">Đã cập nhật dữ liệu.</p>}
      </form>
      <section className="data-panel">
        <h2 className="font-display text-base font-semibold">Thông báo realtime</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cập nhật tự động khi có task, deal, khách hàng mới
        </p>

        <div className="mt-4 space-y-3">
          {/* Trạng thái kết nối */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`}
              />
              <span className="text-sm font-medium">
                {connected ? 'Đang kết nối realtime' : 'Chưa kết nối'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Toggle toast */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bell size={16} />
              </div>
              <div>
                <p className="text-sm font-medium">Hiện thông báo nhanh</p>
                <p className="text-[11px] text-muted-foreground">
                  Toast ở góc phải khi có sự kiện mới
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setToastEnabled(!toastEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${toastEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              aria-label="Bật/tắt thông báo"
            >
              <span
                className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${toastEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
