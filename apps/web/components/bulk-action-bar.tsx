'use client';

import { useState } from 'react';
import { Download, Tag, Trash2, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/lib/use-permission';

type UserOption = {
  id: string;
  name: string;
  role?: string;
};

type Props = {
  count: number;
  users?: UserOption[];
  entityName?: string; 
  onClear: () => void;
  onAssign?: (userId: string) => void;
  onChangeStatus?: (status: any) => void; 
  onExport?: () => void;
  onDelete?: () => void;
};

export function BulkActionBar({
  count,
  users = [],
  entityName = 'mục',
  onClear,
  onAssign,
  onChangeStatus,
  onExport,
  onDelete,
}: Props) {
  const perm = usePermission();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'lead' | 'active' | 'inactive'>('lead');

  if (count === 0) return null;

  return (
    <>
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xl">
          <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            Đã chọn {count}
          </span>

          <div className="mx-1 h-5 border-l border-border" />

          {onAssign && perm.has('customer:update') && (
            <Button variant="ghost" className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => {
                setSelectedUserId(users[0]?.id || '');
                setShowAssignModal(true);
              }}>
              <UserPlus size={14} /> Gán cho
            </Button>
          )}

          {onChangeStatus && perm.has('customer:update') && (
            <Button
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => setShowStatusModal(true)}
            >
              <Tag size={14} /> Đổi trạng thái
            </Button>
          )}

          {onExport && (
            <Button
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={onExport}
            >
              <Download size={14} /> Export CSV
            </Button>
          )}

          <div className="mx-1 h-5 border-l border-border" />

          {onDelete && perm.has('customer:delete') && (
            <Button
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm(`Bạn có chắc chắn muốn xóa ${count} khách hàng đã chọn?`)) {
                  onDelete();
                }
              }}
            >
              <Trash2 size={14} /> Xóa
            </Button>
          )}

          <button
            type="button"
            onClick={onClear}
            className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Bỏ chọn"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showAssignModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowAssignModal(false)} />
          <div className="modal-card max-w-sm">
            <h3 className="font-display text-base font-bold">Chuyển nhượng khách hàng</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Gán {count} khách hàng đã chọn cho nhân viên phụ trách:
            </p>
            <div className="mt-4 space-y-3">
              <select
                className="crm-select w-full"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role || 'Sales'})
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setShowAssignModal(false)}>
                  Hủy
                </Button>
                <Button
                  className="h-8 px-3 text-xs"
                  disabled={!selectedUserId}
                  onClick={() => {
                    onAssign?.(selectedUserId);
                    setShowAssignModal(false);
                  }}
                >
                  Xác nhận gán
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {showStatusModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowStatusModal(false)} />
          <div className="modal-card max-w-sm">
            <h3 className="font-display text-base font-bold">Đổi trạng thái hàng loạt</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Đổi trạng thái cho {count} khách hàng đã chọn:
            </p>
            <div className="mt-4 space-y-3">
              <select
                className="crm-select w-full"
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as 'lead' | 'active' | 'inactive')
                }
              >
                <option value="lead">Lead (Tiềm năng)</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => setShowStatusModal(false)}>
                  Hủy
                </Button>
                <Button
                  className="h-8 px-3 text-xs"
                  onClick={() => {
                    onChangeStatus?.(selectedStatus);
                    setShowStatusModal(false);
                  }}
                >
                  Cập nhật
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
