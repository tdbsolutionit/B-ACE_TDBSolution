'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Building2, CheckCircle, ExternalLink, FolderKanban, History, Mail, MapPin,
  Pencil, Phone, Plus, StickyNote, TrendingUp, User, Wallet, X
} from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney, initials } from '@/lib/utils';
import { ActivityForm } from '@/components/shared/activity-form';
import { Loading } from '@/components/shared/loading';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/use-permission';

const STATUS: Record<string, string> = { lead: 'Lead', active: 'Đang hoạt động', inactive: 'Ngừng hoạt động' };
const OPP: Record<string, string> = { open: 'Đang mở', won: 'Thắng', lost: 'Thua' };

type Detail = CustomerRow & {
  opportunities: ProjectRow[];
  activities: Array<{ id: string; type: string; subject: string; content: string | null; owner: string; createdAt: string }>;
};

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isFullMode = searchParams.get('full') === '1';
  const perm = usePermission();
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
  const [projectStageId, setProjectStageId] = useState('');
  const [projectProbability, setProjectProbability] = useState(20);
  const [projectCloseDate, setProjectCloseDate] = useState('');
  const [projectDesc, setProjectDesc] = useState('');

  async function load() {
    const row = await api<Detail>(`/customers/${params.id}`);
    setCustomer(row);
    setNotes(row.notes || '');
    if ((row.opportunities || []).length > 0) {
      setTab(`Dự án (${row.opportunities.length})`);
    }
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
    try {
      const updated = await api<Detail>(`/customers/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          code: String(data.get('code') || ''),
          name: String(data.get('name') || ''),
          company: String(data.get('company') || ''),
          phone: String(data.get('phone') || ''),
          email: String(data.get('email') || ''),
          address: String(data.get('address') || ''),
          taxCode: String(data.get('taxCode') || ''),
          industry: String(data.get('industry') || ''),
          type: String(data.get('type') || 'business'),
          status: String(data.get('status') || 'lead'),
          sourceName: String(data.get('sourceName') || ''),
        }),
      });
      setCustomer((prev) => (prev ? { ...prev, ...updated } : prev));
      setEdit(false);
      window.dispatchEvent(new CustomEvent('customer:changed', { detail: updated }));
      toast.success('Đã cập nhật thông tin khách hàng');
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật khách hàng');
    }
  }

  async function addProject() {
    if (!projectName.trim() || !stages[0]) return;
    try {
      await api('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          name: projectName.trim(),
          customerId: params.id,
          stageId: projectStageId || stages[0].id,
          value: Number(projectValue) || 0,
          probability: Number(projectProbability) || 0,
          expectedCloseDate: projectCloseDate || undefined,
          description: projectDesc || undefined,
        }),
      });
      setAdding(false);
      setProjectName('');
      setProjectValue('0');
      setProjectDesc('');
      toast.success('Đã thêm dự án mới');
      await load();
      setTab(`Dự án (${projects.length + 1})`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi thêm dự án');
    }
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
      {/* HEADER: back + actions */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="customers"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground xl:hidden"
        >
          <ArrowLeft size={14} /> Danh sách
        </Link>

        <div className="ml-auto flex gap-2">
          {!isBusiness && perm.has('customer:update') && (
            <button
              type="button"
              onClick={() => convert().catch((err: Error) => setError(err.message))}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground whitespace-nowrap"
            >
              <Building2 size={16} /> <span className="hidden sm:inline">Chuyển thành</span> DN
            </button>
          )}
          {!isFullMode && (
            <button
              type="button"
              onClick={() => window.open(`customers/${customer.id}?full=1`, '_blank')}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent whitespace-nowrap"
              title="Mở chi tiết trong tab mới"
            >
              <ExternalLink size={14} /> <span className="hidden sm:inline">Mở rộng</span>
            </button>
          )}
          {perm.has('customer:update') && (
            <button
              type="button"
              onClick={() => setEdit(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent whitespace-nowrap"
            >
              <Pencil size={14} /> Sửa
            </button>
          )}

          <Link
            href="customers"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Đóng chi tiết"
          >
            <X size={16} />
          </Link>
        </div>
      </div>

      {/* CARD: thông tin khách hàng */}
      <div className="detail-card-compact mb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="avatar-initials inline-flex size-12 items-center justify-center rounded-full text-base font-bold">
              {initials(customer.name)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-xl font-bold">{customer.name}</h1>
                {customer.code && (
                  <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                    Mã KH: {customer.code} {customer.shortCode ? `(${customer.shortCode})` : ''}
                  </span>
                )}
                {isBusiness ? (
                  <span className="badge-type badge-type-business"><Building2 size={12} /> Doanh nghiệp</span>
                ) : (
                  <span className="badge-type badge-type-individual"><User size={12} /> Cá nhân</span>
                )}
              </div>
              {customer.company && customer.company !== customer.name && (
                <p className="mt-1 text-xs font-semibold text-foreground/80">{customer.company}</p>
              )}
              <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                {isBusiness && customer.taxCode && <p>MST: <strong className="text-foreground">{customer.taxCode}</strong></p>}
                {isBusiness && customer.industry && <p>Lĩnh vực: <strong className="text-foreground">{customer.industry}</strong></p>}
                {isBusiness && customer.contactName && <p>PIC: <strong className="text-foreground">{customer.contactName}</strong>{customer.contactPhone ? ` · ${customer.contactPhone}` : ''}</p>}
                {!isBusiness && customer.company && customer.company === customer.name && <p>{customer.company}</p>}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className={customer.status === 'active' ? 'status-badge status-success' : customer.status === 'inactive' ? 'status-badge status-warning' : 'status-badge status-blue'}>
                  {STATUS[customer.status]}
                </span>
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

      {/* STATS */}
      <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <Stat icon={<FolderKanban size={20} />} label="Tổng dự án" value={String(projects.length)} note={`${leads.length} lead · ${open.length + won.length} cơ hội`} tone="bg-primary/10 text-primary" />
        <Stat icon={<TrendingUp size={20} />} label="Đang triển khai" value={String(open.length)} tone="bg-blue-100 text-blue-600" />
        <Stat icon={<CheckCircle size={20} />} label="Đã thắng" value={String(won.length)} note={compactMoney(won.reduce((sum, row) => sum + row.value, 0))} tone="bg-green-100 text-green-600" />
        <Stat icon={<Wallet size={20} />} label="Pipeline" value={compactMoney(pipeline)} tone="bg-amber-100 text-amber-600" />
      </div>

      {/* CARD: tabs + content */}
      <div className="detail-card-compact">
        <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
          {tabs.map(([label, Icon]) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(label)}
              className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium ${tab === label || (label.startsWith('Dự án') && tab.startsWith('Dự án')) ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* TAB: Thông tin */}
        {tab === 'Thông tin' && (
          <dl className="w-full space-y-1.5 text-sm">
            {customer.code && (
              <Row label="Mã khách hàng" value={`${customer.code} ${customer.shortCode ? `(Mã số: ${customer.shortCode})` : ''}`} />
            )}
            <Row label="Tên gọi / Tên ngắn" value={customer.name} />
            {customer.company && <Row label="Tên công ty đầy đủ" value={customer.company} />}
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

        {/* TAB: Dự án */}
        {tab.startsWith('Dự án') && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Danh sách dự án và cơ hội</p>
                <p className="text-xs text-muted-foreground">Tổng cộng {projects.length} dự án liên kết với khách hàng này</p>
              </div>
              {perm.has('deal:create') && (
                <button
                  type="button"
                  onClick={() => setAdding(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  <Plus size={16} /> Thêm dự án
                </button>
              )}
            </div>
            {projects.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Chưa có dự án nào cho khách hàng này.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="crm-table w-full">
                  <thead>
                    <tr>
                      <th className="whitespace-nowrap">MÃ DỰ ÁN</th>
                      <th>TÊN DỰ ÁN</th>
                      <th>GIAI ĐOẠN</th>
                      <th>TÌNH TRẠNG</th>
                      <th>GIÁ TRỊ</th>
                      <th>XÁC SUẤT</th>
                      <th>NGÀY DỰ KIẾN / NHẬN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => {
                      const pCode = project.code || project.description?.match(/Mã dự án: ([^|]+)/)?.[1]?.trim();
                      const pStatusText = project.description?.match(/Tình trạng: (.*)/)?.[1]?.trim();
                      return (
                        <tr
                          key={project.id}
                          className="cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => { window.location.href = `/projects/${project.id}`; }}
                        >
                          <td className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{pCode || '—'}</td>
                          <td>
                            <p className="font-medium text-foreground">{project.name}</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{project.isLead ? 'Lead' : 'Cơ hội'}</p>
                          </td>
                          <td>
                            <span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>
                              {project.stage}
                            </span>
                          </td>
                          <td>
                            {pStatusText ? (
                              <span className={`status-badge ${pStatusText.toLowerCase().includes('done') || pStatusText.toLowerCase().includes('triển khai') ? 'status-success' : 'status-blue'}`}>
                                {pStatusText}
                              </span>
                            ) : (
                              <span className={project.status === 'won' ? 'status-badge status-success' : project.status === 'lost' ? 'status-badge status-warning' : 'status-badge status-blue'}>
                                {OPP[project.status]}
                              </span>
                            )}
                          </td>
                          <td className="font-medium">{project.value > 0 ? compactMoney(project.value) : '—'}</td>
                          <td>
                            {project.isLead ? <span className="text-xs text-muted-foreground">—</span> : (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full bg-primary" style={{ width: `${project.probability}%` }} />
                                </div>
                                <span className="text-xs">{project.probability}%</span>
                              </div>
                            )}
                          </td>
                          <td className="text-xs text-muted-foreground">{project.closeDate || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB: Lịch sử */}
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
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.content} · {item.owner} · {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {/* TAB: Ghi chú */}
        {tab === 'Ghi chú' && (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Ghi chú về khách hàng..."
              className="h-32 w-full rounded-md border border-input bg-background p-3 text-sm"
            />
            {perm.has('customer:update') && (
              <button
                type="button"
                onClick={() => saveNotes().catch((err: Error) => setError(err.message))}
                className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Lưu ghi chú
              </button>
            )}
            {saved && <p className="text-sm text-success">Đã lưu ghi chú</p>}
          </div>
        )}
      </div>

      {/* MODAL: Sửa */}
      {edit && (
        <>
          <div className="modal-backdrop" onClick={() => setEdit(false)} />
          <form className="modal-card max-w-2xl" onSubmit={(event) => saveEdit(event).catch((err: Error) => setError(err.message))}>
            <h2 className="text-lg font-semibold">Sửa thông tin khách hàng</h2>
            <p className="mt-1 text-xs text-muted-foreground">Cập nhật thông tin chi tiết của khách hàng.</p>
            
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Hàng 1: Mã KH & Tên khách hàng */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Mã khách hàng</label>
                <input name="code" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.code || ''} placeholder="VD: KH00001" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tên gọi / Tên ngắn <span className="text-destructive">*</span></label>
                <input required name="name" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.name} placeholder="VD: KDC" />
              </div>

              {/* Hàng 2: Tên công ty (Chiếm 2 cột) */}
              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Tên công ty đầy đủ</label>
                <input name="company" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.company || ''} placeholder="VD: CÔNG TY TNHH..." />
              </div>

              {/* Hàng 3: SĐT & Email */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Số điện thoại</label>
                <input name="phone" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.phone || ''} placeholder="0909 xxx xxx" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Email</label>
                <input name="email" type="email" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.email || ''} placeholder="email@congty.vn" />
              </div>

              {/* Hàng 4: Địa chỉ (Chiếm 2 cột) */}
              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Địa chỉ</label>
                <input name="address" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.address || ''} placeholder="Số nhà, đường, phường, quận..." />
              </div>

              {/* Hàng 5: MST & Lĩnh vực */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Mã số thuế</label>
                <input name="taxCode" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.taxCode || ''} placeholder="Mã số thuế" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Lĩnh vực / Ngành nghề</label>
                <input name="industry" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.industry || ''} placeholder="VD: Xây dựng, Công nghệ..." />
              </div>

              {/* Hàng 6: Loại khách, Trạng thái, Nguồn */}
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Loại khách</label>
                <select name="type" className="crm-select" defaultValue={customer.type}>
                  <option value="business">Doanh nghiệp</option>
                  <option value="personal">Cá nhân</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Trạng thái</label>
                <select name="status" className="crm-select" defaultValue={customer.status}>
                  <option value="lead">Lead</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium">Nguồn khách hàng</label>
                <input name="sourceName" className="h-10 rounded-md border border-input px-3 text-sm" defaultValue={customer.sourceName || ''} placeholder="VD: Website, Giới thiệu, Zalo..." />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => setEdit(false)} className="h-9 rounded-md border px-4 text-sm hover:bg-accent">
                Hủy
              </button>
              <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </>
      )}

      {/* MODAL: Thêm dự án */}
      {adding && (
        <>
          <div className="modal-backdrop" onClick={() => setAdding(false)} />
          <div className="modal-card max-w-lg">
            <h2 className="text-base font-bold font-display">Thêm cơ hội / Dự án mới</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tạo cơ hội bán hàng cho khách hàng <strong className="text-foreground">{customer.name}</strong>
            </p>
            <div className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Tên dự án / cơ hội <span className="text-destructive">*</span>
                </label>
                <input
                  className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="VD: Cung cấp giải pháp thiết bị & phần mềm TDB"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Giai đoạn bán hàng</label>
                  <select
                    className="crm-select w-full"
                    value={projectStageId || stages[0]?.id || ''}
                    onChange={(e) => setProjectStageId(e.target.value)}
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Giá trị dự kiến (VNĐ)</label>
                  <CurrencyInput
                    name="value"
                    defaultValue={projectValue}
                    onChange={(val) => setProjectValue(String(val))}
                    placeholder="0"
                    showPreview
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Xác suất thành công (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    value={projectProbability}
                    onChange={(e) => setProjectProbability(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Ngày dự kiến chốt</label>
                  <input
                    type="date"
                    className="h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    value={projectCloseDate}
                    onChange={(e) => setProjectCloseDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Mô tả / Yêu cầu sơ bộ</label>
                <textarea
                  className="w-full h-20 rounded-md border border-input p-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ghi chú nhu cầu khách hàng, thông tin liên hệ phụ..."
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="h-9 rounded-md border px-4 text-sm hover:bg-accent"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!projectName.trim()}
                  onClick={() => addProject().catch((err: Error) => setError(err.message))}
                  className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  Lưu dự án
                </button>
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