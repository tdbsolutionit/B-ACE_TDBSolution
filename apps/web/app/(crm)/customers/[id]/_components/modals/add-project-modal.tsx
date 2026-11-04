'use client';
import { useState } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { StageRow } from '@/lib/crm';
import type { CreateProjectPayload } from '../../_types';

type SubmitPayload = Omit<CreateProjectPayload, 'customerId'>;

interface AddProjectModalProps {
  customerName: string;
  stages: StageRow[];
  onClose: () => void;
  onSubmit: (payload: SubmitPayload) => Promise<void>;
}

export function AddProjectModal({
  customerName,
  stages,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [stageId, setStageId] = useState('');
  const [value, setValue] = useState('0');
  const [probability, setProbability] = useState(20);
  const [closeDate, setCloseDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const defaultStageId = stages[0]?.id || '';
  const canSubmit = Boolean(name.trim()) && Boolean(defaultStageId) && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        stageId: stageId || defaultStageId,
        value: Number(value) || 0,
        probability: Number(probability) || 0,
        expectedCloseDate: closeDate || undefined,
        description: description || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card max-w-lg">
        <h2 className="text-base font-bold font-display">Thêm cơ hội / Dự án mới</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Tạo cơ hội bán hàng cho khách hàng{' '}
          <strong className="text-foreground">{customerName}</strong>
        </p>

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Tên dự án / cơ hội <span className="text-destructive">*</span>
            </label>
            <input
              className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="VD: Cung cấp giải pháp thiết bị & phần mềm TDB"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Giai đoạn bán hàng
              </label>
              <select
                className="crm-select w-full"
                value={stageId || defaultStageId}
                onChange={(event) => setStageId(event.target.value)}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Giá trị dự kiến (VNĐ)
              </label>
              <CurrencyInput
                name="value"
                defaultValue={value}
                onChange={(val) => setValue(String(val))}
                placeholder="0"
                showPreview
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">
                Xác suất thành công (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={probability}
                onChange={(event) => setProbability(Number(event.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Ngày dự kiến chốt
              </label>
              <input
                type="date"
                className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={closeDate}
                onChange={(event) => setCloseDate(event.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Mô tả / Yêu cầu sơ bộ
            </label>
            <textarea
              className="w-full h-20 rounded-md border border-input p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Ghi chú nhu cầu khách hàng, thông tin liên hệ phụ..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border px-4 text-sm hover:bg-accent"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              Lưu dự án
            </button>
          </div>
        </div>
      </div>
    </>
  );
}