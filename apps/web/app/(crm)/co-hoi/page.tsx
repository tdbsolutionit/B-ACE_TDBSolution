'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KanbanSquare, Table as TableIcon } from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { toast } from '@/components/ui/toast';

const OPP: Record<string, string> = { open: 'Đang mở', won: 'Thắng', lost: 'Thua' };

export default function OpportunitiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
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
    router.push(`/du-an/${created.id}`);
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Cơ hội</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Dự án và cơ hội đang theo dõi qua Pipeline.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <KanbanSquare size={14} /> Kanban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <TableIcon size={14} /> Bảng
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedStageId(stages[0]?.id || '');
              setOpen(true);
            }}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Thêm dự án
          </button>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      {viewMode === 'kanban' ? (
        <KanbanBoard
          rows={rows}
          stages={stages}
          onMove={handleMove}
          onCreate={(stageId) => {
            setSelectedStageId(stageId);
            setOpen(true);
          }}
        />
      ) : (
        <section className="data-panel overflow-x-auto">
          <table className="crm-table">
            <thead>
              <tr>
                <th className="whitespace-nowrap">MÃ DỰ ÁN</th>
                <th>DỰ ÁN</th>
                <th>KHÁCH HÀNG</th>
                <th>GIAI ĐOẠN</th>
                <th>GIÁ TRỊ</th>
                <th>XÁC SUẤT</th>
                <th>NGÀY DỰ KIẾN</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((project) => (
                <tr key={project.id} className="cursor-pointer" onClick={() => router.push(`/du-an/${project.id}`)}>
                  <td className="whitespace-nowrap font-mono text-xs font-semibold text-primary">
                    {project.code || '—'}
                  </td>
                  <td>
                    <p className="font-medium">{project.name}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{project.isLead ? 'Lead' : 'Cơ hội'}</p>
                  </td>
                  <td className="text-xs font-medium">{project.customer}</td>
                  <td><span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span></td>
                  <td className="font-medium">{project.value > 0 ? compactMoney(project.value) : '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${project.probability}%` }} /></div>
                      <span className="text-xs">{project.probability}%</span>
                    </div>
                  </td>
                  <td className="text-xs text-muted-foreground">{project.closeDate || '—'}</td>
                  <td><span className={project.status === 'won' ? 'status-badge status-success' : project.status === 'lost' ? 'status-badge status-warning' : 'status-badge status-blue'}>{OPP[project.status]}</span></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Chưa có cơ hội.</td></tr>}
            </tbody>
          </table>
        </section>
      )}
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />

          <form
            className="modal-card"
            onSubmit={(event) =>
              create(event).catch((err: Error) => setError(err.message))
            }
          >
            <h2 className="text-base font-semibold">Thêm dự án</h2>

            <div className="mt-4 grid gap-4">
              {/* Tên dự án */}
              <div className="grid gap-1.5">
                <label htmlFor="new-project-name" className="text-sm font-medium">
                  Tên dự án <span className="text-destructive">*</span>
                </label>
                <input
                  id="new-project-name"
                  name="name"
                  required
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  placeholder="Nhập tên dự án"
                />
              </div>

              {/* Khách hàng */}
              <div className="grid gap-1.5">
                <label htmlFor="new-project-customer" className="text-sm font-medium">
                  Khách hàng <span className="text-destructive">*</span>
                </label>
                <select
                  id="new-project-customer"
                  name="customerId"
                  required
                  className="crm-select"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Chọn khách hàng
                  </option>
                  {customers.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Giai đoạn bán hàng */}
              <div className="grid gap-1.5">
                <label htmlFor="new-project-stage" className="text-sm font-medium">
                  Giai đoạn bán hàng
                </label>
                <select
                  id="new-project-stage"
                  name="stageId"
                  className="crm-select"
                  defaultValue={selectedStageId || stages[0]?.id || ""}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Giá trị và xác suất */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label htmlFor="new-project-value" className="text-sm font-medium">
                    Giá trị dự án (VNĐ)
                  </label>
                  <input
                    id="new-project-value"
                    name="value"
                    type="number"
                    min="0"
                    step="any"
                    className="h-10 rounded-md border border-input px-3 text-sm"
                    placeholder="Nhập giá trị dự án"
                    defaultValue="0"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label
                    htmlFor="new-project-probability"
                    className="text-sm font-medium"
                  >
                    Xác suất thành công (%)
                  </label>
                  <input
                    id="new-project-probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    className="h-10 rounded-md border border-input px-3 text-sm"
                    placeholder="0–100"
                    defaultValue="10"
                  />
                </div>
              </div>

              {/* Ngày dự kiến chốt */}
              <div className="grid gap-1.5">
                <label htmlFor="new-project-close-date" className="text-sm font-medium">
                  Ngày dự kiến chốt dự án
                </label>
                <input
                  id="new-project-close-date"
                  name="closeDate"
                  type="date"
                  className="h-10 rounded-md border border-input px-3 text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ngày dự kiến hoàn tất thương vụ với khách hàng.
                </p>
              </div>

              {/* Nút thao tác */}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-9 rounded-md border px-4 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground"
                >
                  Tạo dự án
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
