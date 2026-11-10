'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { Settings, LinkIcon, Database, User, Eye, EyeOff, HelpCircle, ShieldAlert, CheckCircle2, XCircle, RefreshCw, Save } from 'lucide-react';

interface OdooConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig: any;
  onSuccess: () => void;
}

export function OdooConfigModal({ isOpen, onClose, initialConfig, onSuccess }: OdooConfigModalProps) {
  const [config, setConfig] = useState({ url: '', db: '', username: '', password: '' });
  const [isActive, setIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean, message: string } | null>(null);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        url: initialConfig.url || '',
        db: initialConfig.db || '',
        username: initialConfig.username || '',
        password: ''
      });
      setIsActive(initialConfig.isActive !== false);
      setTestResult(null);
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (config.url && !config.url.startsWith('http://') && !config.url.startsWith('https://')) {
      setConfig(prev => ({ ...prev, url: `http://${prev.url}` }));
    }
  }, [config.url]);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api<{ success: boolean, message: string }>('/integrations/odoo/test', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kết nối tới máy chủ CRM' });
    } finally {
      setTesting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api('/integrations/odoo', {
        method: 'POST',
        body: JSON.stringify({ ...config, isActive }),
      });
      toast.success('Đã lưu cấu hình Odoo');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  }

  const isInsecure = config.url.startsWith('http://') && !config.url.includes('localhost') && !config.url.includes('127.0.0.1');

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
          <Settings size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold">Cấu hình Odoo ERP</h2>
          <p className="text-xs text-muted-foreground">Thiết lập thông tin kết nối API đến máy chủ Odoo.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Odoo URL <span className="text-red-500">*</span></label>
            <input required value={config.url} onChange={e => setConfig({ ...config, url: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="http://localhost:8069" />
            {isInsecure && (
              <p className="flex items-center gap-1 text-[11px] font-medium text-amber-600 mt-1">
                <ShieldAlert size={12} /> Cảnh báo: Bạn đang dùng HTTP không bảo mật.
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Database <span className="text-red-500">*</span></label>
            <input required value={config.db} onChange={e => setConfig({ ...config, db: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="odoo_db" />
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username <span className="text-red-500">*</span></label>
            <input required value={config.username} onChange={e => setConfig({ ...config, username: e.target.value })} className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="admin@company.com" />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                Password / API Key <span className="text-red-500">*</span>
                <div className="group relative flex items-center">
                  <HelpCircle size={14} className="text-muted-foreground hover:text-primary cursor-help" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2 rounded-lg bg-slate-800 p-3 text-xs text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100 z-50">
                    <p className="font-semibold mb-1">Cách lấy API Key:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-300">
                      <li>Vào <strong>Preferences</strong> trên Odoo.</li>
                      <li>Chọn tab <strong>Account Security</strong>.</li>
                      <li>Bấm <strong>New API Key</strong> và sao chép.</li>
                    </ol>
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </div>
              </label>
            </div>
            <div className="relative flex items-center rounded-lg border border-input bg-background shadow-sm transition-all focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={config.password || ''} 
                onChange={e => setConfig({ ...config, password: e.target.value })} 
                className="h-10 w-full rounded-lg bg-transparent pl-3 pr-20 text-sm outline-none placeholder:text-muted-foreground/50" 
                placeholder="Nhập mật khẩu hoặc API Key..." 
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setConfig({ ...config, password: text });
                    } catch (err) {}
                  }}
                  className="rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Dán
                </button>
                <div className="h-4 w-px bg-border my-auto"></div>
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {testResult && (
          <div className={`flex items-start gap-3 rounded-lg p-3 text-xs animate-in zoom-in-95 ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {testResult.success ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <p className="font-semibold">{testResult.message}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-border mt-5">
          <button type="button" onClick={handleTest} disabled={testing || !config.url} className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-purple-100 bg-purple-50 px-4 text-xs font-bold text-purple-700 transition-colors hover:bg-purple-100 disabled:opacity-50">
            {testing ? <RefreshCw size={14} className="animate-spin" /> : null} 
            {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
          </button>

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg border border-input px-4 text-xs font-bold hover:bg-accent">
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-6 text-xs font-bold text-primary-foreground shadow-md transition-transform hover:scale-105 hover:bg-primary/90 disabled:opacity-50">
              <Save size={14} /> {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}