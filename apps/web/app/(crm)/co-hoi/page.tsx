'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';

const OPP: Record<string, string> = { open: 'Đang mở', won: 'Thắng', lost: 'Thua' };

export default function OpportunitiesPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  function load() {
    return api<ProjectRow[]>('/opportunities').then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, []);

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
          <p className="mt-1.5 text-sm text-muted-foreground">Dự án và cơ hội đang theo dõi. Mở một dòng để vào hồ sơ dự án.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Thêm dự án</button>
      </div>
      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      <section className="data-panel overflow-x-auto">
        <table className="crm-table">
          <thead>
            <tr><th>DỰ ÁN</th><th>KHÁCH HÀNG</th><th>GIAI ĐOẠN</th><th>GIÁ TRỊ</th><th>XÁC SUẤT</th><th>NGÀY DỰ KIẾN</th><th>TRẠNG THÁI</th></tr>
          </thead>
          <tbody>
            {rows.map((project) => (
              <tr key={project.id} className="cursor-pointer" onClick={() => router.push(`/du-an/${project.id}`)}>
                <td>
                  <p className="font-medium">{project.name}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{project.isLead ? 'Lead' : 'Cơ hội'}</p>
                </td>
                <td className="text-xs">{project.customer}</td>
                <td><span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span></td>
                <td className="font-medium">{compactMoney(project.value)}</td>
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
            {rows.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Chưa có cơ hội.</td></tr>}
          </tbody>
        </table>
      </section>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={(event) => create(event).catch((err: Error) => setError(err.message))}>
            <h2 className="text-base font-semibold">Thêm dự án</h2>
            <div className="mt-4 grid gap-3">
              <input name="name" required className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tên dự án" />
              <select name="customerId" required className="crm-select">
                <option value="">Chọn khách hàng</option>
                {customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
              <select
                name="stageId"
                className="crm-select"
                defaultValue={stages[0]?.id || ''}
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>{stage.name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input name="value" className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Giá trị" defaultValue="0" />
                <input name="probability" className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Xác suất %" defaultValue="10" />
              </div>
              <input name="closeDate" type="date" className="h-10 rounded-md border border-input px-3 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}
