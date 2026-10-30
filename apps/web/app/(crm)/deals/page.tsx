
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import {
  type CustomerRow,
  type ProjectRow,
  type StageRow,
} from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { KanbanBoard } from './_components/kanban-board';
import { toast } from '@/components/ui/toast';
import { Search, Plus } from 'lucide-react';

type ApiList<T> = T[] | {
  data?: T[] | { items?: T[] };
  items?: T[];
};

function toArray<T>(response: ApiList<T> | null | undefined): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (
      response.data &&
      typeof response.data === 'object' &&
      Array.isArray(response.data.items)
    ) {
      return response.data.items;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }
  }

  return [];
}

export default function OpportunitiesPage() {
  const router = useRouter();

  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [opportunitiesResponse, customersResponse, stagesResponse] =
          await Promise.all([
            api<ApiList<ProjectRow>>('/opportunities'),
            api<ApiList<CustomerRow>>('/customers'),
            api<ApiList<StageRow>>('/opportunities/stages'),
          ]);

        if (cancelled) return;

        setRows(toArray(opportunitiesResponse));
        setCustomers(toArray(customersResponse));
        setStages(toArray(stagesResponse));
      } catch (err: unknown) {
        if (cancelled) return;

        const message =
          err instanceof Error ? err.message : 'Không thể tải dữ liệu CRM';

        setError(message);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
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
    router.push(`/projects/${created.id}`);
  }

  // Tính tổng giá trị các deal chưa chốt (đang mở)
  const totalPipelineValue = rows
    .filter(r => r.status === 'open')
    .reduce((sum, r) => sum + (Number(r.value) || 0), 0);

  const filteredRows = rows.filter(r =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    (r.customer && r.customer.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <>
      {/* HEADER: Căn chỉnh lại toàn bộ khu vực tiêu đề, tìm kiếm và nút thêm mới */}
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        {/* Bên trái: Tiêu đề và Tổng Pipeline */}
        <div>
          <h1 className="font-display text-2xl font-bold">Cơ hội bán hàng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tiến độ các thương vụ và dự báo doanh thu.
          </p>
          
          {/* Khối hiển thị tổng Pipeline gọn gàng */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tổng Pipeline (Đang mở):
            </span>
            <span className="text-base font-bold text-primary">
              {compactMoney(totalPipelineValue)}
            </span>
          </div>
        </div>

        {/* Bên phải: Tìm kiếm và Nút Tạo */}
        <div className="flex items-center gap-3">
          <div className="relative w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Tìm tên cơ hội, khách hàng..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStageId(stages[0]?.id || '');
              setOpen(true);
            }}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> Tạo cơ hội
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {/* Kanban Board */}
      <KanbanBoard
        rows={filteredRows}
        stages={stages}
        onMove={handleMove}
        onCreate={(stageId) => {
          setSelectedStageId(stageId);
          setOpen(true);
        }}
      />

      {/* Modal Thêm Cơ Hội (Giữ nguyên) */}
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
                  {stages.length === 0 && <option value="">Đang tải hoặc chưa có giai đoạn...</option>}
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