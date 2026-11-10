'use client';

import { RefreshCw, Wrench, DownloadCloud } from 'lucide-react';

interface OdooActionsProps {
    isConnected: boolean;
    isActive: boolean;
    syncingCustomers: boolean;
    syncingUsers: boolean;
    repairing: boolean;
    pulling: boolean;
    onToggleActive: (val: boolean) => void;
    onSyncCustomers: () => void;
    onSyncUsers: () => void;
    onRepair: () => void;
    onPull: () => void;
}

export function OdooActions({
    isConnected,
    isActive,
    syncingCustomers,
    syncingUsers,
    repairing,
    pulling,
    onToggleActive,
    onSyncCustomers,
    onSyncUsers,
    onRepair,
    onPull,
}: OdooActionsProps) {
    return (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold border-b border-border/50 pb-3">
                <RefreshCw size={16} className="text-purple-600" /> Trung tâm điều khiển
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-4">
                <div>
                    <p className="text-sm font-bold">Tự động đồng bộ</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Tự động đẩy dữ liệu mới sang Odoo.</p>
                </div>
                <label className={`relative inline-flex items-center ${isConnected ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                    <input
                        type="checkbox"
                        checked={isActive}
                        disabled={!isConnected}
                        onChange={(e) => onToggleActive(e.target.checked)}
                        className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-all after:content-[''] peer-checked:bg-green-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col justify-between rounded-lg border border-border/50 p-4">
                    <div className="mb-4">
                        <p className="text-sm font-bold">Đồng bộ Khách hàng</p>
                        <p className="text-xs text-muted-foreground mt-1">Đẩy danh sách khách hàng chưa có mã ID sang Odoo.</p>
                    </div>
                    <button type="button" onClick={onSyncCustomers} disabled={syncingCustomers || !isConnected} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary/10 px-3 text-sm font-bold text-primary hover:bg-primary/20 disabled:opacity-50">
                        <RefreshCw size={14} className={syncingCustomers ? 'animate-spin' : ''} />
                        {syncingCustomers ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                    </button>
                </div>

                <div className="flex flex-col justify-between rounded-lg border border-border/50 p-4">
                    <div className="mb-4">
                        <p className="text-sm font-bold">Đồng bộ Nhân viên</p>
                        <p className="text-xs text-muted-foreground mt-1">Đẩy toàn bộ danh sách tài khoản đăng nhập sang Odoo.</p>
                    </div>
                    <button type="button" onClick={onSyncUsers} disabled={syncingUsers || !isConnected} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary/10 px-3 text-sm font-bold text-primary hover:bg-primary/20 disabled:opacity-50">
                        <RefreshCw size={14} className={syncingUsers ? 'animate-spin' : ''} />
                        {syncingUsers ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50/50 p-4">
                <div>
                    <p className="text-sm font-bold text-red-700 flex items-center gap-2">
                        <Wrench size={16} /> Phục hồi dữ liệu
                    </p>
                    <p className="text-xs text-red-600/80 mt-1">Quét và tạo lại những khách hàng đã bị xóa bên Odoo.</p>
                </div>
                <button
                    type="button"
                    onClick={onRepair}
                    disabled={repairing || !isConnected}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-red-300 bg-white px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={repairing ? 'animate-spin' : ''} />
                    {repairing ? 'Đang quét...' : 'Phục hồi ngay'}
                </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50/50 p-4">
                <div>
                    <p className="text-sm font-bold text-blue-700 flex items-center gap-2">
                        <DownloadCloud size={16} /> Kéo dữ liệu từ Odoo
                    </p>
                    <p className="text-xs text-blue-600/80 mt-1">Lấy những thay đổi mới nhất từ Odoo về CRM.</p>
                </div>
                <button
                    type="button"
                    onClick={onPull}
                    disabled={pulling || !isConnected}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-blue-300 bg-white px-4 text-sm font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                >
                    <RefreshCw size={14} className={pulling ? 'animate-spin' : ''} />
                    {pulling ? 'Đang kéo...' : 'Kéo ngay'}
                </button>
            </div>
        </div>
    );
}