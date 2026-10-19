'use client';

import { Loading } from '@/components/loading';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import {
  Download, FileUp, LayoutGrid, Plus, Rows, Search,
} from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow } from '@/lib/crm';
import { exportToExcel } from '@/lib/utils';
import { useRealtime } from '@/lib/realtime';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomerTable } from '@/components/customer-table';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { toast } from '@/components/ui/toast';
import { usePermission } from '@/lib/use-permission';

function ListPane() {
  const perm = usePermission();
  const params = useSearchParams();
  const pathname = usePathname();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState(params.get('q') || '');
  const [status] = useState('');
  const [source] = useState('');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', address: '',
    type: 'individual' as 'individual' | 'business',
    status: 'lead' as 'lead' | 'active' | 'inactive',
    sourceName: 'Website', taxCode: '', industry: '',
    contactName: '', contactPhone: '', contactEmail: '',
  });
  const [error, setError] = useState('');
  const [dupes, setDupes] = useState<Array<{ id: string; name: string }>>([]);
  const [importNote, setImportNote] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const csvInput = useRef<HTMLInputElement>(null);

  const { on } = useRealtime();

  useEffect(() => {
    api<CustomerRow[]>('/customers')
      .then(setRows)
      .catch((err: Error) => setError(err.message || 'Không tải được danh sách'))
      .finally(() => setLoading(false));

    api<Array<{ id: string; name: string; role?: string }>>('/users')
      .then(setUsers)
      .catch(() => { });
  }, []);

  // Lắng nghe sự kiện sửa/tạo khách hàng để tự động cập nhật danh sách ngay lập tức không cần F5
  useEffect(() => {
    const handleLocalChange = (e: Event) => {
      const updated = (e as CustomEvent).detail;
      if (updated?.id) {
        setRows((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      }
    };
    window.addEventListener('customer:changed', handleLocalChange);

    const unsubCreated = on('customer:created', (e) => {
      if (e.payload?.id) {
        api<CustomerRow>(`/customers/${e.payload.id}`)
          .then((c) => {
            if (c) {
              setRows((prev) => (prev.some((r) => r.id === c.id) ? prev : [c, ...prev]));
            }
          })
          .catch(() => { });
      }
    });

    const unsubUpdated = on('customer:updated', (e) => {
      if (e.payload?.id) {
        setRows((prev) =>
          prev.map((r) => (r.id === e.payload.id ? { ...r, ...e.payload } : r)),
        );
      }
    });

    return () => {
      window.removeEventListener('customer:changed', handleLocalChange);
      unsubCreated();
      unsubUpdated();
    };
  }, [on]);

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
    lead: rows.filter((row) => row.status === 'lead').length,
    active: rows.filter((row) => row.status === 'active').length,
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
      toast.success(`Đã thêm ${created.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được khách hàng');
    }
  }

  async function importCsv(file: File) {
    const text = await file.text();
    const importRows = parseCustomerCsv(text);
    if (!importRows.length) {
      setImportNote('File CSV cần có cột tên và ít nhất một dòng khách.');
      return;
    }
    const result = await api<{ created: number; skipped: Array<{ name: string; reason: string }> }>('/customers/import', {
      method: 'POST',
      body: JSON.stringify({ rows: importRows }),
    });
    const fresh = await api<CustomerRow[]>('/customers');
    setRows(fresh);
    const skip = result.skipped.length ? ` Bỏ qua ${result.skipped.length}.` : '';
    setImportNote(`Đã thêm ${result.created} khách.${skip}`);
    toast.success(`Đã import ${result.created} khách`);
  }

  const CUSTOMER_EXPORT_COLS = [
    { key: 'name', label: 'Tên khách hàng' },
    { key: 'company', label: 'Công ty' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'taxCode', label: 'Mã số thuế' },
    { key: 'industry', label: 'Ngành nghề' },
    { key: 'type', label: 'Loại khách' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'sourceName', label: 'Nguồn' },
    { key: 'assigneeName', label: 'Người phụ trách' },
  ];

  function exportCustomers(exportRows: CustomerRow[]) {
    if (!exportRows.length) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }
    exportToExcel('danh-sach-khach-hang', exportRows, CUSTOMER_EXPORT_COLS);
    toast.success(`Đã xuất ${exportRows.length} khách hàng ra file Excel (.xls)`);
  }

  async function handleBulkAssign(targetUserId: string) {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number; assigneeName: string }>('/customers/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, assignedTo: targetUserId }),
      });
      setRows((prev) =>
        prev.map((r) =>
          bulk.selected.has(r.id) ? { ...r, assigneeName: res.assigneeName } : r,
        ),
      );
      toast.success(`Đã gán ${res.count} khách cho ${res.assigneeName}`);
      bulk.clear();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gán khách hàng');
    }
  }

  async function handleBulkStatus(newStatus: 'lead' | 'active' | 'inactive') {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number }>('/customers/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      setRows((prev) =>
        prev.map((r) =>
          bulk.selected.has(r.id) ? { ...r, status: newStatus } : r,
        ),
      );
      toast.success(`Đã cập nhật trạng thái cho ${res.count} khách`);
      bulk.clear();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  }

  async function handleBulkDelete() {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api<{ count: number }>('/customers/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      setRows((prev) => prev.filter((r) => !bulk.selected.has(r.id)));
      toast.success(`Đã xóa ${selectedIds.length} khách hàng`);
      bulk.clear();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa khách hàng');
    }
  }

  function handleBulkExport() {
    const selectedRows = rows.filter((r) => bulk.selected.has(r.id));
    exportCustomers(selectedRows);
  }

  const tabs = [
    ['all', 'Tất cả', rows.length],
    ['lead', 'Lead', stats.lead],
    ['has_opp', 'Có cơ hội', rows.filter((row) => row.oppCount > 0).length],
    ['customer', 'Khách hàng', stats.active],
  ] as const;

  const activeId = pathname.startsWith('/khach-hang/')
    ? pathname.split('/')[2]
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold">Khách hàng</h1>
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} / {rows.length} khách hàng
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button
            variant="outline"
            className="h-8 px-2.5 text-xs"
            title="Xuất danh sách ra CSV"
            onClick={() => exportCustomers(filtered)}
          >
            <Download size={14} />
          </Button>
          {perm.has('customer:create') && (
            <>
              <Button
                variant="outline"
                className="h-8 px-2.5 text-xs"
                title="Nhập khách từ file CSV"
                onClick={() => csvInput.current?.click()}
              >
                <FileUp size={14} />
              </Button>
              <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) importCsv(file).catch((err: Error) => setImportNote(err.message));
              }} />
              <Button className="h-8 gap-1 px-2.5 text-xs" onClick={() => setOpen(true)}>
                <Plus size={14} /> Thêm
              </Button>
            </>
          )}
          <input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) importCsv(file).catch((err: Error) => setImportNote(err.message));
          }} />
        </div>
      </div>

      {importNote && (
        <p className="mx-4 mt-3 rounded-md border border-primary/30 bg-secondary px-3 py-2 text-xs">
          {importNote}
        </p>
      )}

      <div className="border-b border-border px-3">
        <div className="-mt-0 flex items-center gap-1 overflow-x-auto">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative whitespace-nowrap px-2.5 py-2.5 text-xs font-medium ${tab === key ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              {label}
              <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
              {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <Input
            className="h-8 pl-8 text-xs"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Tìm theo tên, SĐT, email..."
          />
        </div>
        <button
          type="button"
          onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
          title={density === 'compact' ? 'Chuyển sang thoáng' : 'Chuyển sang gọn'}
        >
          {density === 'compact' ? <LayoutGrid size={13} /> : <Rows size={13} />}
        </button>
      </div>

      {error && !open && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}

      <div className="customer-list-scroll min-h-0 flex-1 overflow-auto">
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
          activeId={activeId}
        />
      </div>

      <BulkActionBar
        count={bulk.count}
        users={users}
        onClear={bulk.clear}
        onAssign={handleBulkAssign}
        onChangeStatus={handleBulkStatus}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
      />

      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <div className="modal-card max-w-2xl">
            <h2 className="text-lg font-semibold">Thêm khách hàng</h2>
            <p className="mt-1 text-sm text-muted-foreground">Chọn loại khách hàng và điền thông tin</p>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setForm({ ...form, type: 'individual' })} className={`rounded-lg border-2 p-3 text-center ${form.type === 'individual' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                  <p className="text-sm font-semibold">Cá nhân</p>
                </button>
                <button type="button" onClick={() => setForm({ ...form, type: 'business' })} className={`rounded-lg border-2 p-3 text-center ${form.type === 'business' ? 'border-primary bg-primary/5' : 'border-input'}`}>
                  <p className="text-sm font-semibold">Doanh nghiệp</p>
                </button>
              </div>
              <Input placeholder={form.type === 'business' ? 'Tên doanh nghiệp *' : 'Tên khách hàng *'} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              {form.type === 'business' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Mã số thuế" value={form.taxCode} onChange={(event) => setForm({ ...form, taxCode: event.target.value })} />
                  <Input placeholder="Lĩnh vực" value={form.industry} onChange={(event) => setForm({ ...form, industry: event.target.value })} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Số điện thoại" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                <Input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
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
                  Đã có khách với số/email này: {dupes.map((item) => item.name).join(', ')}.
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
    </div>
  );
}

function parseCustomerCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase().trim());
  const find = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.includes(name)));
  
  const nameAt = find('tên khách', 'tên', 'ten', 'name');
  const companyAt = find('công ty', 'cong ty', 'company');
  const phoneAt = find('điện thoại', 'dien thoai', 'phone', 'sđt', 'sdt');
  const emailAt = find('email');
  const addressAt = find('địa chỉ', 'dia chi', 'address');
  const taxAt = find('mã số thuế', 'mst', 'tax');
  const industryAt = find('ngành nghề', 'nganh nghe', 'industry');
  const typeAt = find('loại khách', 'loai khach', 'type');
  const statusAt = find('trạng thái', 'trang thai', 'status');
  const sourceAt = find('nguồn', 'nguon', 'source');

  return lines.slice(1).map((line) => {
    const cells = splitCsv(line);
    
    // Lấy giá trị, nếu cột không tồn tại thì trả về rỗng
    const getVal = (index: number) => index >= 0 ? (cells[index] || '').trim() : '';

    // Chuẩn hóa Enum cho Type
    let type = getVal(typeAt).toLowerCase();
    if (type.includes('cá nhân') || type === 'individual') type = 'individual';
    else type = 'business'; // Mặc định là doanh nghiệp

    // Chuẩn hóa Enum cho Status
    let status = getVal(statusAt).toLowerCase();
    if (status.includes('lead') || status.includes('tiềm năng')) status = 'lead';
    else if (status.includes('ngừng') || status.includes('inactive')) status = 'inactive';
    else status = 'active'; // Mặc định là active

    return {
      name: getVal(nameAt) || getVal(0), // Nếu không tìm thấy cột tên, lấy cột đầu tiên
      company: getVal(companyAt),
      phone: getVal(phoneAt),
      email: getVal(emailAt),
      address: getVal(addressAt),
      taxCode: getVal(taxAt),
      industry: getVal(industryAt),
      type,
      status,
      sourceName: getVal(sourceAt) || 'Import CSV',
    };
  }).filter((row) => row.name); 
}

function splitCsv(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++; 
      } else {
        quoted = !quoted;
      }
    } else if ((char === ',' || char === ';') && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function CustomerListPane() {
  return (
    <Suspense fallback={<Loading text="Đang tải danh sách" />}>
      <ListPane />
    </Suspense>
  );
}