'use client';

import { Download, Tag, Trash2, UserPlus, X } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

type Props = {
  count: number;
  onClear: () => void;
  onAssign?: () => void;
  onChangeStage?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
};

export function BulkActionBar({
  count,
  onClear,
  onAssign,
  onChangeStage,
  onExport,
  onDelete,
}: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-2xl">
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          Đã chọn {count}
        </span>

        <div className="mx-1 h-5 border-l border-border" />

        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => {
            onAssign?.();
            toast.info('Chức năng gán đang phát triển');
          }}
        >
          <UserPlus size={14} /> Gán cho
        </Button>

        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => {
            onChangeStage?.();
            toast.info('Chức năng đổi stage đang phát triển');
          }}
        >
          <Tag size={14} /> Đổi trạng thái
        </Button>

        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-xs"
          onClick={() => {
            onExport?.();
            toast.success(`Đã export ${count} khách hàng`);
          }}
        >
          <Download size={14} /> Export CSV
        </Button>

        <div className="mx-1 h-5 border-l border-border" />

        <Button
          variant="ghost"
          className="h-8 gap-1.5 px-2.5 text-xs text-destructive hover:bg-red-50"
          onClick={() => {
            if (confirm(`Xóa ${count} khách hàng đã chọn?`)) {
              onDelete?.();
              toast.success(`Đã xóa ${count} khách hàng`);
              onClear();
            }
          }}
        >
          <Trash2 size={14} /> Xóa
        </Button>

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
  );
}
