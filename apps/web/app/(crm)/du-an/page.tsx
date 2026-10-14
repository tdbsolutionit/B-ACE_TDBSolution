'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { KanbanBoard } from '@/components/kanban/kanban-board';
import { useRealtime } from '@/lib/realtime';
import { CurrencyInput } from '@/components/ui/currency-input';

const STATUS: Record<string, string> = { open: 'Đang mở', won: 'Thắng', lost: 'Thua' };

export default function ProjectsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
  const [open, setOpen] = useState(false);
  const [lost, setLost] = useState<{ id: string; stageId: string } | null>(null);
  const [reason, setReason] = useState('');
  const [presetStageId, setPresetStageId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { on } = useRealtime();

  function load() {
    return api<ProjectRow[]>('/opportunities').then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, []);

  // Realtime: cập nhật Kanban khi có deal mới/đổi stage
  useEffect(() => {
    const refresh = () => {
      load().catch(() => { });
    };
    const unsub1 = on('deal:created', refresh);
    const unsub2 = on('deal:stage-changed', refresh);
    return () => {
      unsub1();
      unsub2();
    };
  }, [on]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const created = await api<ProjectRow>('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        name: String(data.get('name') || ''),
        customerId: String(data.get('customerId') || ''),
        stageId: String(data.get('stageId') || presetStageId || stages[0]?.id || ''),
        value: Number(data.get('value') || 0),
        probability: Number(data.get('probability') || 0),
        expectedCloseDate: String(data.get('closeDate') || ''),
      }),
    });
    router.push(`/du-an/${created.id}`);
  }

  async function move(id: string, stageId: string, lostReason?: string) {
    const stage = stages.find((item) => item.id === stageId);
    if (stage?.isLost && !lostReason?.trim()) {
      setLost({ id, stageId });
      setReason('');
      return;
    }
    const updated = await api<ProjectRow>(`/opportunities/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId, lostReason }),
    });
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...updated } : row)));
    setLost(null);
  }
  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Dự án</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Kéo thẻ sang giai đoạn mới, hoặc mở hồ sơ để xem báo giá và tệp.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
            <button type="button" onClick={() => setView('pipeline')} className={view === 'pipeline' ? 'rounded-full bg-primary px-3 py-1.5 text-primary-foreground' : 'rounded-full px-3 py-1.5 text-muted-foreground'}>Pipeline</button>
            <button type="button" onClick={() => setView('list')} className={view === 'list' ? 'rounded-full bg-primary px-3 py-1.5 text-primary-foreground' : 'rounded-full px-3 py-1.5 text-muted-foreground'}>Danh sách</button>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Thêm dự án</button>
        </div>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {view === 'pipeline' ? (
        <KanbanBoard
          rows={rows}
          stages={stages}
          onMove={(dealId, stageId) => {
            move(dealId, stageId).catch((err: Error) => setError(err.message));
          }}
          onCreate={(stageId) => {
            setPresetStageId(stageId);
            setOpen(true);
          }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((project) => (
            <button key={project.id} type="button" onClick={() => router.push(`/du-an/${project.id}`)} className="project-card rounded-2xl border border-border bg-card p-4 text-left">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{project.name}</p>
                <span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{project.customer}</p>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-medium">{compactMoney(project.value)}</span>
                <span className="text-xs text-muted-foreground">{STATUS[project.status]} · {project.closeDate || 'Chưa chốt'}</span>
              </div>
            </button>
          ))}
          {rows.length === 0 && <p className="text-sm text-muted-foreground">Chưa có dự án.</p>}
        </div>
      )}
      {lost && (
        <>
          <div className="modal-backdrop" onClick={() => setLost(null)} />
          <div className="modal-card">
            <h2 className="text-base font-semibold">Vì sao thua?</h2>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Giá, thời điểm, đối thủ, khách dừng..." className="mt-4 h-24 w-full rounded-md border border-input p-3 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setLost(null)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
              <button type="button" onClick={() => move(lost.id, lost.stageId, reason).catch((err: Error) => setError(err.message))} className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
            </div>
          </div>
        </>
      )}
      {open && (
        <>
          <div
            className="modal-backdrop"
            onClick={() => {
              setOpen(false);
              setPresetStageId(null);
            }}
          />
          <form
            className="modal-card"
            onSubmit={(event) => create(event).catch((err: Error) => setError(err.message))}
          >
            <h2 className="text-base font-semibold">Thêm dự án</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Điền thông tin cơ hội / dự án mới
            </p>

            <div className="mt-5 grid gap-4">
              {/* Tên dự án */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Tên dự án <span className="text-destructive">*</span>
                </label>
                <input
                  name="name"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="VD: Hợp đồng thi công nhà xưởng"
                />
              </div>

              {/* Khách hàng */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Khách hàng <span className="text-destructive">*</span>
                </label>
                <select
                  name="customerId"
                  required
                  defaultValue=""
                  className="crm-select w-full"
                >
                  <option value="" disabled>-- Chọn khách hàng --</option>
                  {customers.map((row) => (
                    <option key={row.id} value={row.id}>{row.name}</option>
                  ))}
                </select>
              </div>

              {/* Giai đoạn */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Giai đoạn
                </label>
                <select
                  name="stageId"
                  className="crm-select w-full"
                  defaultValue={presetStageId || ''}
                >
                  <option value="">-- Chọn giai đoạn --</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Bỏ trống sẽ dùng giai đoạn &quot;{stages[0]?.name || 'Lead mới'}&quot;
                </p>
              </div>

              {/* Giá trị + Xác suất — cùng hàng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Giá trị dự kiến (VND)
                  </label>
                  <CurrencyInput
                    name="value"
                    defaultValue={0}
                    placeholder="0"
                    showPreview
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    VD: gõ 1000000 → hiển thị 1.000.000
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    Xác suất (%)
                  </label>
                  <input
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="10"
                    defaultValue="10"
                  />
                </div>
              </div>

              {/* Ngày dự kiến chốt */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-foreground">
                  Ngày dự kiến chốt
                </label>
                <input
                  name="closeDate"
                  type="date"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Để trống nếu chưa xác định
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setPresetStageId(null);
                  }}
                  className="h-9 rounded-md border border-input bg-background px-4 text-sm hover:bg-accent"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
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
