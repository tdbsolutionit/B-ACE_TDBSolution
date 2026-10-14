'use client';

import { CustomerTable } from '@/components/customer-table';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { LayoutGrid, Rows } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileUp, Plus, Search, UserCheck, UserMinus, UserPlus, UsersRound } from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow } from '@/lib/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Suspense } from 'react';

const STATUS: Record<string, string> = {
  lead: 'Lead',
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
};

function CustomersScreen() {
  const params = useSearchParams();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState(params.get('q') || '');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', address: '',
    type: 'individual' as 'individual' | 'business', status: 'lead' as 'lead' | 'active' | 'inactive',
    sourceName: 'Website', taxCode: '', industry: '', contactName: '', contactPhone: '', contactEmail: '',
  });
  const [error, setError] = useState('');
  const [dupes, setDupes] = useState<Array<{ id: string; name: string }>>([]);
  const [importNote, setImportNote] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const csvInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<CustomerRow[]>('/customers')
      .then(setRows)
      .catch((err: Error) => setError(err.message || 'Không tải được danh sách'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const phone = form.phone.trim();
    const email = form.email.trim();
    if (!open || (phone.replace(/\D/g, '').length < 8 && !email.includes('@'))) {
      setDupes([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams();
      if (phone) query.set('phone', phone);
      if (email) query.set('email', email);
      api<{ matches: Array<{ id: string; name: string }> }>(`/customers/duplicates?${query}`)
        .then((result) => setDupes(result.matches))
        .catch(() => setDupes([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, form.phone, form.email]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tab === 'lead' && row.status !== 'lead') return false;
      if (tab === 'customer' && row.status !== 'active') return false;
      if (tab === 'has_opp' && row.oppCount === 0) return false;
      if (status && row.status !== status) return false;
      if (source && row.sourceName !== source) return false;
      const blob = `${row.name} ${row.company || ''} ${row.phone || ''} ${row.email || ''}`.toLowerCase();
      return blob.includes(q.toLowerCase());
    });
  }, [rows, tab, q, status, source]);

  const bulk = useBulkSelection(filtered);

  const stats = {
    total: rows.length,
    active: rows.filter((row) => row.status === 'active').length,
    lead: rows.filter((row) => row.status === 'lead').length,
    inactive: rows.filter((row) => row.status === 'inactive').length,
  };

  async function addCustomer() {
    if (!form.name.trim()) {
      setError('Nhập tên khách hàng');
      return;
    }
    try {
      const created = await api<CustomerRow>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          type: form.type === 'business' ? 'business' : 'personal',
          status: form.status,
          sourceName: form.sourceName,
          taxCode: form.taxCode,
          industry: form.industry,
          contactName: form.contactName,
          contactPhone: form.contactPhone,
          contactEmail: form.contactEmail,
        }),
      });
      setRows((current) => [created, ...current]);
      setOpen(false);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được khách hàng');
    }
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const rows = parseCustomerCsv(text);
    if (!rows.length) {
      setImportNote('File CSV cần có cột tên và ít nhất một dòng khách.');
      return;
    }
    const result = await api<{ created: number; skipped: Array<{ name: string; reason: string }> }>('/customers/import', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    });
    const fresh = await api<CustomerRow[]>('/customers');
    setRows(fresh);
    const skip = result.skipped.length ? ` Bỏ qua ${result.skipped.length}: ${result.skipped.map((item) => item.name).join(', ')}.` : '';
    setImportNote(`Đã thêm ${result.created} khách.${skip}`);
  }

  const tabs = [
    ['all', 'Tất cả', rows.length],
    ['lead', 'Lead', stats.lead],
    ['has_opp', 'Có cơ hội', rows.filter((row) => row.oppCount > 0).length],
    ['customer', 'Khách hàng', stats.active],
  ] as const;

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Khách hàng</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Xây dựng mối quan hệ bền vững với từng khách hàng.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => csvInput.current?.click()}><FileUp size={16} /> Nhập CSV</Button>
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) importCsv(file).catch((err: Error) => setImportNote(err.message));
          }} />
          <BulkActionBar
            count={bulk.count}
            onClear={bulk.clear}
            onExport={() => {
              const rowsToExport = filtered.filter((r) => bulk.selected.has(r.id));
              const csv = [
                ['Tên', 'Công ty', 'SĐT', 'Email', 'Trạng thái'].join(','),
                ...rowsToExport.map((r) =>
                  [r.name, r.company || '', r.phone || '', r.email || '', r.status]
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(','),
                ),
              ].join('\n');
              const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <Button onClick={() => setOpen(true)}><Plus size={16} /> Thêm khách hàng</Button>
        </div>
      </div>
      {importNote && <p className="notice-panel mb-4 rounded-xl border border-primary/30 bg-secondary px-4 py-3 text-sm">{importNote}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat icon={<UsersRound size={20} />} label="Tổng khách hàng" value={stats.total} tone="bg-primary/10 text-primary" />
        <Stat icon={<UserCheck size={20} />} label="Đang hoạt động" value={stats.active} tone="bg-green-100 text-green-600" />
        <Stat icon={<UserPlus size={20} />} label="Lead mới" value={stats.lead} tone="bg-blue-100 text-blue-600" />
        <Stat icon={<UserMinus size={20} />} label="Ngừng hoạt động" value={stats.inactive} tone="bg-amber-100 text-amber-600" />
      </div>
      <section className="data-panel">
        <div className="-mt-2 mb-4 flex items-center gap-1 overflow-x-auto border-b border-border">
          {tabs.map(([key, label, count]) => (
            <button key={key} type="button" onClick={() => setTab(key)} className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium ${tab === key ? 'text-primary' : 'text-muted-foreground'}`}>
              {label} <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{count}</span>
              {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
        <div className="filter-bar">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
            <Input className="pl-9" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Tìm theo tên, số điện thoại, email..." />
          </div>
          <select className="crm-select" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">Tất cả nguồn</option>
            {['Website', 'Zalo', 'Facebook', 'Email', 'Giới thiệu'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="crm-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="lead">Lead</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngừng hoạt động</option>
          </select>
          <button
            type="button"
            onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
            title={density === 'compact' ? 'Chuyển sang thoáng' : 'Chuyển sang gọn'}
          >
            {density === 'compact' ? <LayoutGrid size={14} /> : <Rows size={14} />}
            {density === 'compact' ? 'Thoáng' : 'Gọn'}
          </button>
        </div>
        {error && !open && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Đang tải khách hàng…</p>}
        <CustomerTable
          rows={filtered}
          loading={loading}
          density={density}
          selected={bulk.selected}
          onToggle={bulk.toggle}
          onSelectAll={bulk.selectAll}
          onClearSelection={bulk.clear}
          isAllSelected={bulk.isAllSelected}
          isPartial={bulk.isPartial}
        />
      </section>
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal-card max-w-2xl">
            <h2 className="text-lg font-semibold">Thêm khách hàng</h2>
            <p className="mt-1 text-sm text-muted-foreground">Chọn loại khách hàng và điền thông tin</p>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({ ...form, type: 'individual' })} className={`rounded-lg border-2 p-4 text-center ${form.type === 'individual' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                  <p className="text-sm font-semibold">Cá nhân</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Khách hàng cá nhân</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'business' })} className={`rounded-lg border-2 p-4 text-center ${form.type === 'business' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                  <p className="text-sm font-semibold">Doanh nghiệp</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Công ty / tổ chức</p>
                </button>
              </div>
              <Input placeholder={form.type === 'business' ? 'Tên doanh nghiệp *' : 'Tên khách hàng *'} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              {form.type === 'business' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Mã số thuế *" value={form.taxCode} onChange={(event) => setForm({ ...form, taxCode: event.target.value })} />
                  <Input placeholder="Lĩnh vực hoạt động *" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder={form.type === 'business' ? 'SĐT doanh nghiệp' : 'Số điện thoại'} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                <Input placeholder={form.type === 'business' ? 'Email doanh nghiệp' : 'Email'} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              {form.type === 'business' && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Người liên hệ (PIC)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Họ tên" value={form.contactName} onChange={(event) => setForm({ ...form, contactName: event.target.value })} />
                    <Input placeholder="SĐT" value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
                    <Input placeholder="Email" value={form.contactEmail} onChange={(event) => setForm({ ...form, contactEmail: event.target.value })} />
                  </div>
                </div>
              )}
              <Input placeholder="Địa chỉ" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <select className="crm-select w-full" value={form.sourceName} onChange={(event) => setForm({ ...form, sourceName: event.target.value })}>
                  {['Website', 'Zalo', 'Facebook', 'Email', 'Giới thiệu'].map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className="crm-select w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'lead' | 'active' | 'inactive' })}>
                  <option value="lead">Lead</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>
              {dupes.length > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Đã có khách với số hoặc email này: {dupes.map((item) => item.name).join(', ')}.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
                <Button onClick={addCustomer}>Lưu</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function parseCustomerCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase());
  const find = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.includes(name)));
  const nameAt = find('tên', 'ten', 'name', 'khách', 'khach');
  const phoneAt = find('điện', 'dien', 'phone', 'sđt', 'sdt');
  const emailAt = find('email');
  const companyAt = find('công', 'cong', 'company');
  const taxAt = find('mst', 'thuế', 'thue', 'tax');
  return lines.slice(1).map((line) => {
    const cells = splitCsv(line);
    return {
      name: (nameAt >= 0 ? cells[nameAt] : cells[0]) || '',
      phone: phoneAt >= 0 ? cells[phoneAt] || '' : '',
      email: emailAt >= 0 ? cells[emailAt] || '' : '',
      company: companyAt >= 0 ? cells[companyAt] || '' : '',
      taxCode: taxAt >= 0 ? cells[taxAt] || '' : '',
    };
  }).filter((row) => row.name);
}

function splitCsv(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if ((char === ',' || char === ';') && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="data-panel flex items-center gap-3 p-4">
      <span className={`flex size-10 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense>
      <CustomersScreen />
    </Suspense>
  );
}
