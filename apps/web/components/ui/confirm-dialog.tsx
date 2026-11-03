'use client';

import { Modal } from './modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
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
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
          <AlertTriangle size={24} />
        </div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        
        <div className="mt-6 flex w-full gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 rounded-md border border-input bg-background py-2 text-sm font-medium hover:bg-accent"
          >
            {cancelLabel}
          </button>
          <button 
            type="button" 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`flex-1 rounded-md py-2 text-sm font-medium text-white ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}