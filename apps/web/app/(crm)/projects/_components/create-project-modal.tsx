'use client';

import { type CustomerRow, type StageRow } from '@/lib/crm';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  customers: CustomerRow[];
  stages: StageRow[];
}

export function CreateProjectModal({ open, onClose, onSubmit, customers, stages }: CreateProjectModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal-card" onSubmit={onSubmit}>
        <h2 className="text-base font-semibold">Thêm dự án thực thi</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Mã dự án</label>
            <input name="code" className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Để trống để hệ thống tự động sinh mã" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Tên dự án <span className="text-destructive">*</span></label>
            <input name="name" required className="h-10 rounded-md border border-input px-3 text-sm" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Khách hàng <span className="text-destructive">*</span></label>
            <select name="customerId" required className="crm-select">
              <option value="">Chọn khách hàng</option>
              {(Array.isArray(customers) ? customers : []).map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Tạo dự án</button>
          </div>
        </div>
      </form>
    </>
  );
}