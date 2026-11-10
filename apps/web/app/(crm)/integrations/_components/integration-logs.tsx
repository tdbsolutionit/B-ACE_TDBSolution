'use client';

import { AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';

interface IntegrationLogsProps {
  logs: any[];
  loading: boolean;
  onRefresh: () => void;
}

export function IntegrationLogs({ logs, loading, onRefresh }: IntegrationLogsProps) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-[350px]">
      <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 font-bold">
          <Clock size={16} className="text-primary" />
          Lịch sử đồng bộ
        </div>
        <button onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto subtle-scrollbar">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Đang tải log...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <CheckCircle2 size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold">Chưa có lịch sử</p>
            <p className="text-xs text-muted-foreground mt-1">Các hoạt động đồng bộ sẽ xuất hiện ở đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const isSuccess = log.status === 'success';
              const entityName = log.action === 'SYNC_CUSTOMER' ? 'Khách hàng' : 'Nhân viên';

              return (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-muted/10 transition-colors">
                  <div className={`mt-0.5 shrink-0 ${isSuccess ? 'text-green-500' : 'text-red-500'}`}>
                    {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                      {entityName} {isSuccess ? 'đồng bộ thành công' : 'gặp lỗi'}
                    </p>
                    {!isSuccess && (
                      <p className="text-xs text-red-600 mt-1 break-words">{log.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}