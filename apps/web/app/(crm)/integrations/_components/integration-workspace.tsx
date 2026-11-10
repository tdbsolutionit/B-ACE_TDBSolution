'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { Server, CheckCircle2, XCircle, Settings, Database, Link as LinkIcon, User, ShieldAlert } from 'lucide-react';
import { OdooConfigModal } from './odoo-config-modal';
import { OdooActions } from './odoo-actions';
import { IntegrationLogs } from './integration-logs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface IntegrationWorkspaceProps {
  selectedId: string | null;
  odooConfig: any;
  onRefresh: () => void;
}

export function IntegrationWorkspace({ selectedId, odooConfig, onRefresh }: IntegrationWorkspaceProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  const [syncingCustomers, setSyncingCustomers] = useState(false);
  const [syncingUsers, setSyncingUsers] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [pulling, setPulling] = useState(false);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [confirmRepairOpen, setConfirmRepairOpen] = useState(false);

  const isConnected = !!odooConfig?.url;

  const fetchLogs = async () => {
    if (!isConnected) return;
    setLoadingLogs(true);
    try {
      const res = await api<any[]>('/integrations/odoo/logs');
      setLogs(res || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (odooConfig) {
      setIsActive(odooConfig.isActive !== false);
    }
  }, [odooConfig]);

  useEffect(() => {
    fetchLogs();
  }, [isConnected, syncingCustomers, syncingUsers, repairing, pulling]);

  async function handleToggleActive(val: boolean) {
    setIsActive(val);
    
    if (isConnected) {
      try {
        const payload = {
          url: odooConfig.url,
          db: odooConfig.db,
          username: odooConfig.username,
          password: '', 
          isActive: val
        };
        
        await api('/integrations/odoo', { 
          method: 'POST', 
          body: JSON.stringify(payload) 
        });
        
        toast.success(val ? 'Đã bật tự động đồng bộ' : 'Đã tắt tự động đồng bộ');
        
      } catch (err) {
        toast.error('Lỗi khi cập nhật trạng thái');
        setIsActive(!val);
      }
    }
  }

  async function handleSyncCustomers() {
    setSyncingCustomers(true);
    try {
      await api('/integrations/odoo/sync-now', { method: 'POST' });
      toast.success('Đã đồng bộ các khách hàng mới thành công!');
      setTimeout(onRefresh, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi đồng bộ khách hàng');
    } finally {
      setSyncingCustomers(false);
    }
  }

  async function handleSyncUsers() {
    setSyncingUsers(true);
    try {
      const res = await api<{ count: number }>('/integrations/odoo/sync-users', { method: 'POST' });
      toast.success(`Đã đồng bộ thành công ${res.count} nhân viên sang Odoo!`);
    } catch (err: any) {
      toast.error('Lỗi khi đồng bộ nhân viên');
    } finally {
      setSyncingUsers(false);
    }
  }

  function handleRepairClick() {
    setConfirmRepairOpen(true);
  }

  async function handleRepairSync() {
    setRepairing(true);
    try {
      const res = await api<{ count: number, message: string }>('/integrations/odoo/repair-sync', { method: 'POST' });
      toast.success(res.message);
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi phục hồi dữ liệu');
      throw err;
    } finally {
      setRepairing(false);
    }
  }

  async function handlePullData() {
    setPulling(true);
    try {
      const res = await api<{ count: number, message: string }>('/integrations/odoo/pull-now', { method: 'POST' });
      toast.success(res.message);
      onRefresh();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi kéo dữ liệu từ Odoo');
    } finally {
      setPulling(false);
    }
  }

  if (!selectedId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in">
        <div className="flex size-20 items-center justify-center rounded-2xl bg-muted/50 text-muted-foreground mb-6">
          <Settings size={32} />
        </div>
        <h2 className="text-xl font-bold">Chưa chọn nền tảng</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Vui lòng chọn một nền tảng từ danh sách bên trái để bắt đầu cấu hình.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-md bg-purple-100 text-purple-700">
            <Server size={18} />
          </div>
          <h1 className="text-lg font-bold">Odoo ERP Connection</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Trạng thái:</span>
            {odooConfig?.syncStatus === 'error' ? (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600"><XCircle size={12} /> Lỗi đồng bộ</span>
            ) : isConnected ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-600"><CheckCircle2 size={12} /> Đã kết nối</span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold text-muted-foreground"><XCircle size={12} /> Chưa kết nối</span>
            )}
          </div>
          <div className="w-px h-5 bg-border"></div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-semibold hover:bg-accent"
          >
            <Settings size={14} /> Cài đặt
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto subtle-scrollbar p-6">
        <div className="mx-auto max-w-3xl space-y-6">
          
          {isConnected ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <LinkIcon size={14} /> <span className="text-xs font-semibold uppercase">Máy chủ Odoo</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate" title={odooConfig?.url}>{odooConfig?.url}</p>
              </div>
              
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Database size={14} /> <span className="text-xs font-semibold uppercase">Database</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate">{odooConfig?.db}</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-1">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <User size={14} /> <span className="text-xs font-semibold uppercase">Tài khoản</span>
                </div>
                <p className="text-sm font-bold text-foreground truncate" title={odooConfig?.username}>{odooConfig?.username}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 py-12">
              <ShieldAlert size={32} className="text-muted-foreground mb-3" />
              <p className="text-sm font-semibold">Chưa có cấu hình kết nối</p>
              <p className="text-xs text-muted-foreground mt-1">Vui lòng bấm nút Cài đặt ở góc trên để bắt đầu.</p>
            </div>
          )}

          <OdooActions 
            isConnected={isConnected}
            isActive={isActive}
            syncingCustomers={syncingCustomers}
            syncingUsers={syncingUsers}
            repairing={repairing}
            pulling={pulling}
            onToggleActive={handleToggleActive}
            onSyncCustomers={handleSyncCustomers}
            onSyncUsers={handleSyncUsers}
            onRepair={handleRepairClick}
            onPull={handlePullData}
          />

          <IntegrationLogs 
            logs={logs}
            loading={loadingLogs}
            onRefresh={fetchLogs}
          />
        </div>
      </div>

      <OdooConfigModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialConfig={odooConfig}
        onSuccess={onRefresh}
      />

      <ConfirmDialog
        isOpen={confirmRepairOpen}
        onClose={() => setConfirmRepairOpen(false)}
        onConfirm={handleRepairSync}
        title="Xác nhận phục hồi dữ liệu"
        description="Hệ thống sẽ quét toàn bộ khách hàng để đồng bộ lại những ai đã bị xóa bên Odoo. Quá trình này có thể mất vài phút. Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Đồng ý phục hồi"
        isDanger={true}
      />
    </div>
  );
}