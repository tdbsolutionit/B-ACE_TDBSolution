'use client';

import { useState } from 'react';

interface LostStageModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function LostStageModal({ open, onClose, onSubmit }: LostStageModalProps) {
  const [reason, setReason] = useState('');
  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <h2 className="text-base font-semibold">Vì sao thua?</h2>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Giá, thời điểm, đối thủ, khách dừng..." className="mt-4 h-24 w-full rounded-md border border-input p-3 text-sm" />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
          <button type="button" onClick={() => onSubmit(reason)} className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
        </div>
      </div>
    </>
  );
}