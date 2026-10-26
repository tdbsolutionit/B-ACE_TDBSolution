'use client';

import { type ProjectRow, type StageRow } from '@/lib/crm';

interface EditProjectModalProps {
  open: boolean;
  onClose: () => void;
  project: ProjectRow;
  stages: StageRow[];
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export function EditProjectModal({ open, onClose, project, stages, onSubmit }: EditProjectModalProps) {
  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal-card" onSubmit={onSubmit}>
        <h2 className="text-base font-semibold">Sửa dự án</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Mã dự án</label>
            <input name="code" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={project.code || ''} placeholder="Chưa có mã dự án" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Tên dự án <span className="text-destructive">*</span></label>
            <input name="name" required className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Nhập tên dự án" defaultValue={project.name} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Giá trị dự án (VNĐ)</label>
              <input name="value" type="number" min="0" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={project.value} />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Xác suất (%)</label>
              <input name="probability" type="number" min="0" max="100" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={project.probability} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Ngày dự kiến chốt</label>
            <input name="closeDate" type="date" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={project.closeDate || ''} />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Giai đoạn</label>
            <select name="stageId" className="crm-select" defaultValue={project.stageId}>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu thay đổi</button>
          </div>
        </div>
      </form>
    </>
  );
}