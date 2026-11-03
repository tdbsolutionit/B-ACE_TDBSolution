'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { PageHeader } from '@/components/shared/page-header';
import { Modal } from '@/components/ui/modal';
import { Server, CheckCircle2, XCircle, Save, ShieldCheck, Settings2, RefreshCw, Clock, AlertTriangle } from 'lucide-react';

type OdooConfig = {
  url: string;
  db: string;
  username: string;
  password?: string;
  isActive?: boolean;
};

type SyncStatus = {
  lastSyncedAt: string | null;
  syncStatus: string;
  errorMessage: string | null;
};

export default function IntegrationsPage() {
  const [odooConfig, setOdooConfig] = useState<OdooConfig>({ url: '', db: '', username: '', password: '' });
  const [isOdooConnected, setIsOdooConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ lastSyncedAt: null, syncStatus: 'idle', errorMessage: null });
  
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    api<any>('/integrations/odoo')
      .then((res) => {
        if (res && res.url) {
          setOdooConfig({ ...res, password: '' });
          setIsOdooConnected(true);
          setIsActive(res.isActive !== false);
          
          if (res.lastSyncedAt || res.syncStatus) {
            setSyncStatus({
              lastSyncedAt: res.lastSyncedAt,
              syncStatus: res.syncStatus || 'idle',
              errorMessage: res.errorMessage
            });
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/integrations/odoo', {
        method: 'POST',
        body: JSON.stringify({ ...odooConfig, isActive }),
      });
      toast.success('Đã lưu cấu hình Odoo');
      setIsOdooConnected(true);
    } catch (err: any) {
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await api<{ success: boolean, message: string }>('/integrations/odoo/test', {
        method: 'POST',
        body: JSON.stringify(odooConfig),
      });
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
    } catch (err) {
      toast.error('Không thể kết nối đến máy chủ CRM');
    } finally {
      setTesting(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await api('/integrations/odoo/sync-now', { method: 'POST' });
      toast.success('Đã bắt đầu quá trình đồng bộ ngầm!');
      // Cập nhật lại trạng thái sau vài giây (demo)
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, lastSyncedAt: new Date().toISOString(), syncStatus: 'success' }));
      }, 2000);
    } catch (err) {
      toast.error('Lỗi khi kích hoạt đồng bộ');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Đang tải danh sách tích hợp...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <PageHeader 
        title="Integration Hub" 
        description="Kết nối hệ thống CRM với các nền tảng bên thứ 3 để tự động hóa quy trình." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Card Odoo */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Server size={24} />
            </div>
            {isOdooConnected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                <CheckCircle2 size={12} /> Đang hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                <XCircle size={12} /> Chưa kết nối
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold mb-1">Odoo ERP</h3>
          <p className="text-sm text-muted-foreground flex-1">Đồng bộ dữ liệu Khách hàng tự động sang phần mềm Odoo.</p>

          {isOdooConnected && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
              <Clock size={14} />
              Lần cuối: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa đồng bộ'}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedApp('odoo')}
              className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              {isOdooConnected ? 'Cấu hình' : 'Kết nối'}
            </button>
            {isOdooConnected && (
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                title="Đồng bộ ngay"
                className="rounded-md border border-input bg-primary/10 text-primary py-2 px-3 text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={selectedApp === 'odoo'} onClose={() => setSelectedApp(null)} maxWidth="max-w-2xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Quản lý kết nối Odoo ERP</h2>
              <p className="text-xs text-muted-foreground">Cấu hình đường truyền và kiểm soát quá trình đồng bộ.</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Form nhập liệu */}
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Odoo URL <span className="text-red-500">*</span></label>
              <input required value={odooConfig.url} onChange={e => setOdooConfig({ ...odooConfig, url: e.target.value })} className="h-10 rounded-md border border-input px-3 text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Tên Database <span className="text-red-500">*</span></label>
              <input required value={odooConfig.db} onChange={e => setOdooConfig({ ...odooConfig, db: e.target.value })} className="h-10 rounded-md border border-input px-3 text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Username <span className="text-red-500">*</span></label>
              <input required value={odooConfig.username} onChange={e => setOdooConfig({ ...odooConfig, username: e.target.value })} className="h-10 rounded-md border border-input px-3 text-sm focus:border-primary outline-none" />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Password / API Key <span className="text-red-500">*</span></label>
              <input type="password" value={odooConfig.password || ''} onChange={e => setOdooConfig({ ...odooConfig, password: e.target.value })} className="h-10 rounded-md border border-input px-3 text-sm focus:border-primary outline-none" />
            </div>

            {/* Bật/tắt */}
            <div className="md:col-span-2 flex items-center gap-2 bg-muted/30 p-3 rounded-lg border border-border">
              <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="size-4 cursor-pointer" />
              <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Tự động đồng bộ khi có dữ liệu mới</label>
            </div>

            {/* Khu vực trạng thái (Chỉ hiện khi đã kết nối) */}
            {isOdooConnected && (
              <div className="md:col-span-2 border-t border-border pt-4 mt-2">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <RefreshCw size={16} className="text-primary" /> Trạng thái đồng bộ
                </h3>
                <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
                  <div>
                    <p className="text-sm font-medium">Lần đồng bộ cuối:</p>
                    <p className="text-xs text-muted-foreground">{syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}</p>
                  </div>
                  <button type="button" onClick={handleSyncNow} disabled={syncing} className="inline-flex h-9 items-center gap-2 rounded-md bg-secondary px-4 text-sm font-medium text-primary hover:bg-secondary/80">
                    <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                  </button>
                </div>
                {syncStatus.syncStatus === 'error' && (
                  <div className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-md">
                    <AlertTriangle size={16} className="shrink-0" />
                    <p>Lỗi đồng bộ gần nhất: {syncStatus.errorMessage}</p>
                  </div>
                )}
              </div>
            )}

            {/* Nút Submit */}
            <div className="md:col-span-2 pt-4 border-t border-border flex items-center justify-between gap-3">
              <button type="button" onClick={handleTest} disabled={testing || !odooConfig.url} className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
                {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedApp(null)} className="h-9 rounded-md border border-input px-4 text-sm hover:bg-accent">Đóng</button>
                <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  <Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}