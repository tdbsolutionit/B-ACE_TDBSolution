'use client';

import { useState } from 'react';
import { Modal } from './modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>; // Hỗ trợ cả hàm async
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Xác nhận xóa',
  description = 'Bạn có chắc chắn muốn thực hiện hành động này? Thao tác này không thể hoàn tác.',
  confirmLabel = 'Xóa',
  cancelLabel = 'Hủy',
  isDanger = true,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsPending(true);
      await onConfirm();
      onClose();
    } catch (error) {
      // Lỗi đã được bắt ở hàm onConfirm (thường là hiển thị toast)
      // Nên ở đây ta không làm gì cả để Modal không bị đóng khi có lỗi
    } finally {
      setIsPending(false);
    }
  };

  const handleClose = () => {
    if (!isPending) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <AlertTriangle size={24} />
        </div>
        
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        
        <div className="mt-6 flex w-full gap-3">
          <button 
            type="button" 
            disabled={isPending}
            onClick={handleClose} 
            className="flex flex-1 items-center justify-center rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          
          <button 
            type="button" 
            disabled={isPending}
            onClick={handleConfirm} 
            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-medium text-white disabled:opacity-50 ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}