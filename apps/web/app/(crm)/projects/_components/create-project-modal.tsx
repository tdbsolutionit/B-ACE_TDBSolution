'use client';

import { type StageRow } from '@/lib/crm';
import { CustomerSelect } from '@/components/shared/customer-select';
import { Modal } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  stages: StageRow[];
}

export function CreateProjectModal({ open, onClose, onSubmit, stages }: CreateProjectModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose}>
      <form onSubmit={onSubmit}>
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
            <CustomerSelect name="customerId" required />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Giai đoạn</label>
            <select name="stageId" className="crm-select">
              {stages.length === 0 && <option value="">Đang tải hoặc chưa có giai đoạn...</option>}
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm hover:bg-accent">Hủy</button>
            <SubmitButton isSaving={false} label="Tạo dự án" />
          </div>
        </div>
      </form>
    </Modal>
  );
}