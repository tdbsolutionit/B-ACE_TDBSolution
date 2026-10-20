'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ChevronRight, ClipboardList, FileText, Plus, ShoppingCart, User } from 'lucide-react';
import { ActivityForm } from '@/components/activity-form';
import { ProjectFiles } from '@/components/project-files';
import { api } from '@/lib/auth';
import { type DocCard, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';

const TABS = [
  { id: 'proposal' as const, label: 'Đề xuất', icon: ClipboardList, color: '#16a34a', bg: '#dcfce7' },
  { id: 'quote' as const, label: 'Báo giá', icon: FileText, color: '#C9A961', bg: '#F5EBD0' },
  { id: 'po' as const, label: 'Đơn hàng', icon: ShoppingCart, color: '#d97706', bg: '#fef3c7' },
];

const STATUS: Record<DocCard['status'], { label: string; bg: string; color: string }> = {
  draft: { label: 'Nháp', bg: '#fef3c7', color: '#92400e' },
  sent: { label: 'Đã gửi', bg: '#F5EBD0', color: '#A8894A' },
  accepted: { label: 'Chấp nhận', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#991b1b' },
  expired: { label: 'Hết hạn', bg: '#f1f5f9', color: '#475569' },
};

type Detail = ProjectRow & { quotes: DocCard[]; activities: Array<{ id: string; subject: string; content: string | null; createdAt: string; owner: string }> };

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Detail | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('proposal');
  const [edit, setEdit] = useState(false);
  const [lostStage, setLostStage] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const docs = project?.quotes || [];
  const current = TABS.find((item) => item.id === tab)!;
  const cards = useMemo(() => docs.filter((doc) => doc.kind === tab), [docs, tab]);

  async function load() {
    const row = await api<Detail>(`/opportunities/${params.id}`);
    if (!row) throw new Error('Không tìm thấy dự án');
    setProject(row);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, [params.id]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api(`/opportunities/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: String(data.get('name') || ''),
        code: String(data.get('code') || ''),
        value: Number(data.get('value') || 0),
        probability: Number(data.get('probability') || 0),
        expectedCloseDate: String(data.get('closeDate') || ''),
        stageId: String(data.get('stageId') || ''),
      }),
    });
    setEdit(false);
    await load();
  }

  async function move(stageId: string, lostReason?: string) {
    await api(`/opportunities/${params.id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stageId, ...(lostReason ? { lostReason } : {}) }),
    });
    setLostStage(null);
    setReason('');
    await load();
  }

  function chooseStage(stage: StageRow) {
    if (stage.isLost) {
      setLostStage(stage.id);
      return;
    }
    move(stage.id).catch((err: Error) => setError(err.message));
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!project) return <p className="text-sm text-muted-foreground">Đang tải dự án…</p>;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/khach-hang" className="hover:text-foreground">Khách hàng</Link>
        <ChevronRight size={12} />
        <Link href={`/khach-hang/${project.customerId}`} className="hover:text-foreground">{project.customer}</Link>
        <ChevronRight size={12} />
        <span className="font-medium text-foreground">{project.name}</span>
      </div>

      <div className="data-panel mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold">{project.name}</h1>
              {project.code && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  {project.code}
                </span>
              )}
              <span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center text-xs text-slate-500">
              <span>Giá trị: <strong className="text-slate-900">{project.value > 0 ? compactMoney(project.value) : '—'}</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Xác suất: <strong className="text-slate-900">{project.probability}%</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Chốt dự kiến: <strong className="text-slate-900">{project.closeDate || '—'}</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Phụ trách: <strong className="text-slate-900">{project.owner || '—'}</strong></span>
              {project.status === 'lost' && project.lostReason && <span className="ml-3">Lý do thua: <strong className="text-slate-900">{project.lostReason}</strong></span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEdit(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent">Sửa</button>
            <Link href={`/khach-hang/${project.customerId}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"><User size={14} /> Khách hàng</Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {stages.map((stage) => (
            <button key={stage.id} type="button" onClick={() => chooseStage(stage)} className={stage.id === project.stageId ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground' : 'rounded-full border px-3 py-1 text-xs'}>
              {stage.name}
            </button>
          ))}
        </div>
      </div>

      <div className="data-panel">
        <div className="mb-5 flex overflow-x-auto border-b border-border">
          {TABS.map((item) => {
            const Icon = item.icon;
            const count = docs.filter((doc) => doc.kind === item.id).length;
            return (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={tab === item.id ? 'doc-tab active' : 'doc-tab'}>
                <Icon size={16} />
                <span>{item.label}</span>
                <span className="tab-count">{count}</span>
              </button>
            );
          })}
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted-foreground">{cards.length} {current.label.toLowerCase()}{cards.length === 0 ? ' - chưa có' : ''}</p>
          <Link href={tab === 'quote' ? `/du-an/${project.id}/bao-gia/tao` : `/du-an/${project.id}/bao-gia/tao?kind=${tab}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium text-white" style={{ background: current.color }}>
            <Plus size={14} /> Tạo {current.label.toLowerCase()}
          </Link>
        </div>
        {cards.length === 0 ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full" style={{ background: current.bg, color: current.color }}>
              <current.icon size={32} />
            </div>
            <p className="text-sm font-medium">Chưa có {current.label.toLowerCase()}</p>
          </div>
        ) : (
          <div className="doc-card-grid">
            {cards.map((card) => {
              const status = STATUS[card.status];
              return (
                <Link key={card.id} href={`/bao-gia/${card.id}`} className="rounded-[10px] border border-border bg-white p-4 hover:shadow-md">
                  <p className="text-xs font-semibold" style={{ color: current.color }}>{card.number}</p>
                  <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                  <p className="mb-3 mt-3 line-clamp-2 min-h-9 text-[13px] font-medium">{card.title}</p>
                  <div className="flex items-center justify-between border-t border-border pt-2.5">
                    <span className="text-[11px] text-slate-400">{card.date.split('-').reverse().join('/')}</span>
                    <strong className="text-sm" style={{ color: current.color }}>{compactMoney(card.price)}</strong>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <ProjectFiles opportunityId={project.id} />

      <div className="data-panel mt-5">
        <h2 className="mb-3 text-sm font-semibold">Hoạt động gần đây</h2>
        <ActivityForm relatedType="opportunity" relatedId={project.id} onSaved={() => load().catch((err: Error) => setError(err.message))} />
        {project.activities.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p> : project.activities.map((item) => (
          <div key={item.id} className="border-l-2 border-primary/30 py-2 pl-3">
            <p className="text-sm">{item.subject}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.owner} · {item.createdAt}</p>
          </div>
        ))}
      </div>

      {lostStage && (
        <>
          <div className="modal-backdrop" onClick={() => setLostStage(null)} />
          <div className="modal-card">
            <h2 className="text-base font-semibold">Vì sao thua?</h2>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Giá, thời điểm, đối thủ, khách dừng..." className="mt-4 h-24 w-full rounded-md border border-input p-3 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setLostStage(null)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
              <button type="button" onClick={() => move(lostStage, reason).catch((err: Error) => setError(err.message))} className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
            </div>
          </div>
        </>
      )}

      {edit && (
        <>
          <div className="modal-backdrop" onClick={() => setEdit(false)} />

          <form
            className="modal-card"
            onSubmit={(event) =>
              save(event).catch((err: Error) => setError(err.message))
            }
          >
            <h2 className="text-base font-semibold">Sửa dự án</h2>

            <div className="mt-4 grid gap-4">
              <label className="block text-xs font-semibold mb-1">Mã dự án</label>
              <input name="code" className="h-10 w-full rounded-md border border-input px-3 text-sm" defaultValue={project.code || ''} placeholder="Chưa có mã dự án" />
            </div>

            <div className="mt-4 grid gap-4">
              {/* Tên dự án */}
              <div className="grid gap-1.5">
                <label htmlFor="project-name" className="text-sm font-medium">
                  Tên dự án <span className="text-destructive">*</span>
                </label>
                <input
                  id="project-name"
                  name="name"
                  required
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  placeholder="Nhập tên dự án"
                  defaultValue={project.name}
                />
              </div>

              {/* Giá trị và xác suất */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label htmlFor="project-value" className="text-sm font-medium">
                    Giá trị dự án (VNĐ)
                  </label>
                  <input
                    id="project-value"
                    name="value"
                    type="number"
                    min="0"
                    className="h-10 rounded-md border border-input px-3 text-sm"
                    placeholder="VD: 50000000"
                    defaultValue={project.value}
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="project-probability" className="text-sm font-medium">
                    Xác suất thành công (%)
                  </label>
                  <input
                    id="project-probability"
                    name="probability"
                    type="number"
                    min="0"
                    max="100"
                    className="h-10 rounded-md border border-input px-3 text-sm"
                    placeholder="0–100"
                    defaultValue={project.probability}
                  />
                </div>
              </div>

              {/* Ngày dự kiến chốt */}
              <div className="grid gap-1.5">
                <label htmlFor="project-close-date" className="text-sm font-medium">
                  Ngày dự kiến chốt dự án
                </label>
                <input
                  id="project-close-date"
                  name="closeDate"
                  type="date"
                  className="h-10 rounded-md border border-input px-3 text-sm"
                  defaultValue={project.closeDate}
                />
              </div>

              {/* Giai đoạn */}
              <div className="grid gap-1.5">
                <label htmlFor="project-stage" className="text-sm font-medium">
                  Giai đoạn bán hàng
                </label>
                <select
                  id="project-stage"
                  name="stageId"
                  className="crm-select"
                  defaultValue={project.stageId}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nút thao tác */}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEdit(false)}
                  className="h-9 rounded-md border px-4 text-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
