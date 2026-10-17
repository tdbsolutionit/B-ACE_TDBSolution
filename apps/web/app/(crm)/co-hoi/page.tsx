'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { toast } from '@/components/ui/toast';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  function load() {
    return api<ProjectRow[]>('/opportunities').then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, []);

  async function handleMove(dealId: string, stageId: string) {
    try {
      const updated = await api<ProjectRow>(`/opportunities/${dealId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId }),
      });
      setRows((prev) => prev.map((r) => (r.id === dealId ? { ...r, ...updated } : r)));
      toast.success(`Đã chuyển giai đoạn "${updated.name}" → ${updated.stage}`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi chuyển giai đoạn');
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const created = await api<ProjectRow>('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        name: String(data.get('name') || ''),
        customerId: String(data.get('customerId') || ''),
        stageId: String(data.get('stageId') || ''),
        value: Number(data.get('value') || 0),
        probability: Number(data.get('probability') || 0),
        expectedCloseDate: String(data.get('closeDate') || ''),
      }),
    });
    router.push(`/du-an/${created.id}`); // Chuyển hướng sang trang chi tiết dự án/cơ hội
  }

  // Tính tổng giá trị các deal chưa chốt (đang mở)
  const totalPipelineValue = rows
    .filter(r => r.status === 'open')
    .reduce((sum, r) => sum + (Number(r.value) || 0), 0);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Cơ hội bán hàng</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Theo dõi tiến độ các thương vụ và dự báo doanh thu.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Thống kê nhanh */}
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Tổng Pipeline (Đang mở)</span>
            <span className="text-lg font-bold text-primary">{compactMoney(totalPipelineValue)}</span>
          </div>
          
          <button
            type="button"
            onClick={() => {
              setSelectedStageId(stages[0]?.id || '');
              setOpen(true);
            }}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            + Tạo cơ hội
          </button>
        </div>
      </div>
      
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {/* Chỉ hiển thị Kanban */}
      <KanbanBoard
        rows={rows}
        stages={stages}
        onMove={handleMove}
        onCreate={(stageId) => {
          setSelectedStageId(stageId);
          setOpen(true);
        }}
      />

      {/* Modal Thêm Cơ Hội (Giữ nguyên logic của bạn) */}
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={(event) => create(event).catch((err: Error) => setError(err.message))}>
            <h2 className="text-base font-semibold">Thêm Cơ hội Mới</h2>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tên cơ hội <span className="text-destructive">*</span></label>
                <input name="name" required className="h-10 rounded-md border border-input px-3 text-sm" placeholder="VD: Cung cấp phần mềm ERP" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Khách hàng <span className="text-destructive">*</span></label>
                <select name="customerId" required className="crm-select" defaultValue="">
                  <option value="" disabled>Chọn khách hàng</option>
                  {customers.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Giai đoạn</label>
                <select name="stageId" className="crm-select" defaultValue={selectedStageId || stages[0]?.id || ""}>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Giá trị dự kiến (VNĐ)</label>
                  <input name="value" type="number" min="0" step="any" className="h-10 rounded-md border border-input px-3 text-sm" placeholder="0" defaultValue="0" />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm font-medium">Xác suất (%)</label>
                  <input name="probability" type="number" min="0" max="100" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue="10" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Ngày dự kiến chốt</label>
                <input name="closeDate" type="date" className="h-10 rounded-md border border-input px-3 text-sm" />
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Tạo cơ hội</button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}