'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CheckCircle, FolderKanban, History, Mail, MapPin, Pencil, Phone, Plus, StickyNote, TrendingUp, User, Wallet } from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney, initials } from '@/lib/utils';
import { ActivityForm } from '@/components/activity-form';
import { Loading } from '@/components/loading';
import { CurrencyInput } from '@/components/ui/currency-input';

const STATUS: Record<string, string> = { lead: 'Lead', active: 'Đang hoạt động', inactive: 'Ngừng hoạt động' };
const OPP: Record<string, string> = { open: 'Đang mở', won: 'Thắng', lost: 'Thua' };

type Detail = CustomerRow & {
  opportunities: ProjectRow[];
  activities: Array<{ id: string; type: string; subject: string; content: string | null; owner: string; createdAt: string }>;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('Thông tin');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [projectName, setProjectName] = useState('');
  const [projectValue, setProjectValue] = useState('0');

  async function load() {
    const row = await api<Detail>(`/customers/${params.id}`);
    setCustomer(row);
    setNotes(row.notes || '');
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message || 'Không tải được khách hàng'));
  }, [params.id]);

  useEffect(() => {
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, []);

  const projects = customer?.opportunities || [];
  const isBusiness = customer?.type === 'business';
  const won = projects.filter((row) => row.status === 'won');
  const open = projects.filter((row) => row.status === 'open' && !row.isLead);
  const leads = projects.filter((row) => row.isLead);
  const pipeline = open.reduce((sum, row) => sum + row.value, 0);
  const tabs = useMemo(() => [
    ['Thông tin', User],
    [`Dự án (${projects.length})`, FolderKanban],
    ['Lịch sử tương tác', History],
    ['Ghi chú', StickyNote],
  ] as const, [projects.length]);

  async function convert() {
    await api(`/customers/${params.id}/convert`, { method: 'POST' });
    await load();
  }

  async function saveNotes() {
    await api(`/customers/${params.id}`, { method: 'PATCH', body: JSON.stringify({ notes }) });
    setSaved(true);
    await load();
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api(`/customers/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: String(data.get('name') || ''),
        phone: String(data.get('phone') || ''),
        email: String(data.get('email') || ''),
        address: String(data.get('address') || ''),
        taxCode: String(data.get('taxCode') || ''),
        industry: String(data.get('industry') || ''),
        status: String(data.get('status') || 'lead'),
      }),
    });
    setEdit(false);
    await load();
  }

  async function addProject() {
    if (!projectName.trim() || !stages[0]) return;
    await api('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        name: projectName,
        customerId: params.id,
        stageId: stages[0].id,
        value: Number(projectValue) || 0,
      }),
    });
    setAdding(false);
    setProjectName('');
    await load();
    setTab(`Dự án (${projects.length + 1})`);
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
          <p className="text-sm font-medium text-destructive">Không tải được dữ liệu</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return <Loading text="Đang tải hồ sơ khách hàng" />;
  }

  return (
    <div className="w-full px-5 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/khach-hang"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground xl:hidden"
        >
          <ArrowLeft size={14} /> Danh sách
        </Link>
        <div className="flex gap-2 ml-auto">
          {!isBusiness && (
            <button type="button" onClick={() => convert().catch((err: Error) => setError(err.message))} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground whitespace-nowrap">
              <Building2 size={16} /> <span className="hidden sm:inline">Chuyển thành</span> DN
            </button>
          )}
          <button type="button" onClick={() => setEdit(true)} className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent whitespace-nowrap">
            <Pencil size={14} /> Sửa
          </button>
        </div>
      </div>

      <div className="detail-card-compact mb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="avatar-initials inline-flex size-12 items-center justify-center rounded-full text-base font-bold">{initials(customer.name)}</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold">{customer.name}</h1>
                {isBusiness ? (
                  <span className="badge-type badge-type-business"><Building2 size={12} /> Doanh nghiệp</span>
                ) : (
                  <span className="badge-type badge-type-individual"><User size={12} /> Cá nhân</span>
                )}
              </div>
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {isBusiness && customer.taxCode && <p>MST: <strong className="text-foreground">{customer.taxCode}</strong></p>}
                {isBusiness && customer.industry && <p>Lĩnh vực: <strong className="text-foreground">{customer.industry}</strong></p>}
                {isBusiness && customer.contactName && <p>PIC: <strong className="text-foreground">{customer.contactName}</strong>{customer.contactPhone ? ` · ${customer.contactPhone}` : ''}</p>}
                {!isBusiness && customer.company && <p>{customer.company}</p>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={customer.status === 'active' ? 'status-badge status-success' : customer.status === 'inactive' ? 'status-badge status-warning' : 'status-badge status-blue'}>{STATUS[customer.status]}</span>
                {customer.sourceName && <span className="source-badge">{customer.sourceName}</span>}
              </div>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            {customer.phone && <div className="flex items-center gap-2"><Phone size={16} className="text-muted-foreground" />{customer.phone}</div>}
            {customer.email && <div className="flex items-center gap-2"><Mail size={16} className="text-muted-foreground" />{customer.email}</div>}
            {customer.address && <div className="flex items-center gap-2"><MapPin size={16} className="text-muted-foreground" />{customer.address}</div>}
            {customer.assigneeName && <div className="flex items-center gap-2"><User size={16} className="text-muted-foreground" />Phụ trách: <strong>{customer.assigneeName}</strong></div>}
          </div>
        </div>
      </div>

      <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Stat icon={<FolderKanban size={20} />} label="Tổng dự án" value={String(projects.length)} note={`${leads.length} lead · ${open.length + won.length} cơ hội`} tone="bg-primary/10 text-primary" />
        <Stat icon={<TrendingUp size={20} />} label="Đang triển khai" value={String(open.length)} tone="bg-blue-100 text-blue-600" />
        <Stat icon={<CheckCircle size={20} />} label="Đã thắng" value={String(won.length)} note={compactMoney(won.reduce((sum, row) => sum + row.value, 0))} tone="bg-green-100 text-green-600" />
        <Stat icon={<Wallet size={20} />} label="Pipeline" value={compactMoney(pipeline)} tone="bg-amber-100 text-amber-600" />
      </div>

      <div className="detail-card-compact">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
          {tabs.map(([label, Icon]) => (
            <button key={label} type="button" onClick={() => setTab(label)} className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium ${tab === label || (label.startsWith('Dự án') && tab.startsWith('Dự án')) ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'}`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {tab === 'Thông tin' && (
          <dl className="w-full space-y-1.5 text-sm">
            <Row label={isBusiness ? 'Tên doanh nghiệp' : 'Tên khách hàng'} value={customer.name} />
            {isBusiness && <Row label="Mã số thuế" value={customer.taxCode || '—'} />}
            {isBusiness && <Row label="Lĩnh vực" value={customer.industry || '—'} />}
            <Row label="Điện thoại" value={customer.phone || '—'} />
            <Row label="Email" value={customer.email || '—'} />
            <Row label="Địa chỉ" value={customer.address || '—'} />
            <Row label="Trạng thái" value={STATUS[customer.status]} />
            <Row label="Nguồn" value={customer.sourceName || '—'} />
            <Row label="Phụ trách" value={customer.assigneeName || '—'} />
            <Row label="Ngày tạo" value={customer.createdAt.slice(0, 10)} />
          </dl>
        )}

        {tab.startsWith('Dự án') && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Tất cả dự án và cơ hội của khách hàng này</p>
              <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus size={16} /> Thêm dự án</button>
            </div>
            {projects.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Chưa có dự án nào cho khách hàng này.</p>
            ) : (
              <table className="crm-table">
                <thead>
                  <tr><th>DỰ ÁN</th><th>GIAI ĐOẠN</th><th>GIÁ TRỊ</th><th>XÁC SUẤT</th><th>NGÀY DỰ KIẾN</th><th>TRẠNG THÁI</th></tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id} className="cursor-pointer" onClick={() => { window.location.href = `/du-an/${project.id}`; }}>
                      <td>
                        <p className="font-medium">{project.name}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{project.isLead ? 'Lead' : 'Cơ hội'}</p>
                      </td>
                      <td><span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span></td>
                      <td className="font-medium">{project.value > 0 ? compactMoney(project.value) : '—'}</td>
                      <td>
                        {project.isLead ? <span className="text-xs text-muted-foreground">—</span> : (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${project.probability}%` }} /></div>
                            <span className="text-xs">{project.probability}%</span>
                          </div>
                        )}
                      </td>
                      <td className="text-xs text-muted-foreground">{project.closeDate || '—'}</td>
                      <td><span className={project.status === 'won' ? 'status-badge status-success' : project.status === 'lost' ? 'status-badge status-warning' : 'status-badge status-blue'}>{OPP[project.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {tab === 'Lịch sử tương tác' && (
          <>
            <ActivityForm relatedType="customer" relatedId={customer.id} onSaved={() => load().catch((err: Error) => setError(err.message))} />
            {customer.activities.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Chưa có lịch sử tương tác.</p>
            ) : (
              <ul className="space-y-3">
                {customer.activities.map((item) => (
                  <li key={item.id} className="border-b border-border pb-3">
                    <p className="text-sm font-medium">{item.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{item.content} · {item.owner} · {new Date(item.createdAt).toLocaleString('vi-VN')}</p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === 'Ghi chú' && (
          <div className="space-y-3">
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ghi chú về khách hàng..." className="h-32 w-full rounded-md border border-input bg-background p-3 text-sm" />
            <button type="button" onClick={() => saveNotes().catch((err: Error) => setError(err.message))} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Lưu ghi chú</button>
            {saved && <p className="text-sm text-success">Đã lưu ghi chú</p>}
          </div>
        )}
      </div>

      {edit && (
        <>
          <div className="modal-backdrop" onClick={() => setEdit(false)} />
          <form className="modal-card" onSubmit={(event) => saveEdit(event).catch((err: Error) => setError(err.message))}>
            <h2 className="text-base font-semibold">Sửa khách hàng</h2>
            <div className="mt-4 grid gap-3">
              <input name="name" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.name} />
              <input name="phone" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.phone || ''} placeholder="Điện thoại" />
              <input name="email" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.email || ''} placeholder="Email" />
              <input name="address" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.address || ''} placeholder="Địa chỉ" />
              {isBusiness && <input name="taxCode" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.taxCode || ''} placeholder="Mã số thuế" />}
              {isBusiness && <input name="industry" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.industry || ''} placeholder="Lĩnh vực" />}
              <select name="status" className="crm-select" defaultValue={customer.status}>
                <option value="lead">Lead</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEdit(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
              </div>
            </div>
          </form>
        </>
      )}

      {adding && (
        <>
          <div className="modal-backdrop" onClick={() => setAdding(false)} />
          <div className="modal-card">
            <h2 className="text-base font-semibold">Thêm dự án</h2>
            <div className="mt-4 grid gap-3">
              <input className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tên dự án" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
              <CurrencyInput
                name="value"
                defaultValue={projectValue}
                placeholder="0"
                showPreview
              />              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAdding(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="button" onClick={() => addProject().catch((err: Error) => setError(err.message))} className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Lưu</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

function Stat({ icon, label, value, note, tone }: { icon: React.ReactNode; label: string; value: string; note?: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${tone}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="truncate text-base font-bold leading-tight" title={value}>{value}</p>
        </div>
      </div>
      {note && <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}