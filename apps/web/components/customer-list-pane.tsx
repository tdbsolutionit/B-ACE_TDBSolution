'use client';

import { Pagination } from '@/components/ui/pagination';
import { Loading } from '@/components/loading';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import * as XLSX from 'xlsx';
import {
  Download, FileUp, LayoutGrid, Plus, Rows, Search,
} from 'lucide-react';
import { api } from '@/lib/auth';
import { type CustomerRow, type PaginatedResponse } from '@/lib/crm';
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
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', address: '',
    type: 'business' as 'individual' | 'business',
    status: 'active' as 'lead' | 'active' | 'inactive',
    sourceName: 'Website', taxCode: '', industry: '',
  });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{
    total: number;
    totalPages: number;
    stats?: { lead: number; active: number; hasOpp: number };
  }>({ total: 0, totalPages: 1, stats: { lead: 0, active: 0, hasOpp: 0 } });
  const limit = 20;

  const { on } = useRealtime();

  useEffect(() => {
    setPage(1);
  }, [tab, q]);
  
useEffect(() => {
    setLoading(true);
    api<PaginatedResponse<CustomerRow>>(`/customers?page=${page}&limit=${limit}&q=${q}&tab=${tab}`)
      .then((res) => {
        setRows(res.data || []); 
        setMeta(res.meta || { total: 0, totalPages: 1, stats: { lead: 0, active: 0, hasOpp: 0 } });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, q, limit, tab]);

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
        }),
      });
      setRows((current) => [created, ...current]);
      setOpen(false);
      setError('');
      toast.success(`Đã thêm ${created.name}`);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Không lưu được khách hàng');
    }
  }

  // Realtime
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
            if (c) setRows((prev) => (prev.some((r) => r.id === c.id) ? prev : [c, ...prev]));
          })
          .catch(() => { });
      }
    });

    const unsubUpdated = on('customer:updated', (e) => {
      if (e.payload?.id) {
        setRows((prev) => prev.map((r) => (r.id === e.payload.id ? { ...r, ...e.payload } : r)));
      }
    });

    return () => {
      window.removeEventListener('customer:changed', handleLocalChange);
      unsubCreated();
      unsubUpdated();
    };
  }, [on]);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const data: any[] = XLSX.utils.sheet_to_json(worksheet, { range: 1 });

        if (!data.length) {
          toast.error('File trống hoặc không đúng định dạng.');
          return;
        }

        const formattedRows = data.map((row: any) => {
          const getVal = (keys: string[]) => {
            for (const key of keys) {
              const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
              if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
                const val = String(row[matchedKey]).trim();
                if (val !== 'N/A') return val;
              }
            }
            return '';
          };
          const name = getVal(['Tên khách hàng', 'Tên KH', 'Tên']);
          if (!name || name === 'N/A') return null;
          let code = getVal(['Mã', 'Mã khách hàng', 'Mã KH', 'code']);
          let shortCode = getVal(['Mã số ( Code)', 'Mã số', 'shortCode']);
          if (shortCode && shortCode.startsWith('KH')) {
            shortCode = shortCode.replace('KH', '').replace(/^0+/, '');
          }

          return {
            name: name,
            code: code || undefined,             // Gửi Mã KH
            shortCode: shortCode || undefined,   // Gửi Mã số
            company: getVal(['Thông tin khách hàng', 'Công ty']) || name,
            taxCode: getVal(['MST', 'Mã số thuế']),
            address: getVal(['Địa chỉ']),
            website: getVal(['WEBSITE', 'Website']),
            industry: getVal(['Lĩnh vực', 'Ngành nghề']),
            phone: getVal(['Số điện thoại']),
            email: getVal(['Email']),
            type: 'business',
            status: 'active',
            sourceName: 'Import File',
          };
        }).filter(Boolean);

        if (!formattedRows.length) {
          toast.error('Không tìm thấy dữ liệu khách hàng hợp lệ trong file.');
          return;
        }

        // Gọi API import
        const result = await api<{ created: number; skipped: Array<{ name: string; reason: string }> }>('/customers/import', {
          method: 'POST',
          body: JSON.stringify({ rows: formattedRows }),
        });

        const fresh = await api<CustomerRow[]>('/customers');
        setRows(fresh);

        // Hiển thị thông báo thành công bằng Toast
        toast.success(`Đã import thành công ${result.created} khách hàng!`);
        
        if (result.skipped.length > 0) {
          toast.error(`Bỏ qua ${result.skipped.length} dòng do trùng SĐT/Email.`);
        }
        
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi đọc file Excel/CSV');
      }
    };

    // Đọc file dưới dạng binary
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (tab === 'lead' && row.status !== 'lead') return false;
      if (tab === 'customer' && row.status !== 'active') return false;
      if (tab === 'has_opp' && row.oppCount === 0) return false;
      if (status && row.status !== status) return false;
      if (source && row.sourceName !== source) return false;
      const blob = `${row.name} ${row.company || ''} ${row.phone || ''} ${row.email || ''} ${row.code || ''} ${row.shortCode || ''}`.toLowerCase();
      
      return blob.includes(q.toLowerCase());
    });
  }, [rows, tab, q, status, source]);

  const bulk = useBulkSelection(filtered);

  const stats = {
    lead: rows.filter((row) => row.status === 'lead').length,
    active: rows.filter((row) => row.status === 'active').length,
  };

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
    toast.success(`Đã xuất ${exportRows.length} khách hàng ra file Excel`);
  }

  async function handleBulkAssign(targetUserId: string) {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number; assigneeName: string }>('/customers/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, assignedTo: targetUserId }),
      });
      setRows((prev) => prev.map((r) => (bulk.selected.has(r.id) ? { ...r, assigneeName: res.assigneeName } : r)));
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
      setRows((prev) => prev.map((r) => (bulk.selected.has(r.id) ? { ...r, status: newStatus } : r)));
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
    ['all', 'Tất cả', meta.total],
    ['lead', 'Lead', meta.stats?.lead || 0],
    ['has_opp', 'Có cơ hội', meta.stats?.hasOpp || 0],
    ['customer', 'Khách hàng', meta.stats?.active || 0],
  ] as const;

  const activeId = pathname.startsWith('/khach-hang/') ? pathname.split('/')[2] : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold">Khách hàng</h1>
          <p className="text-[11px] text-muted-foreground">{filtered.length} / {meta.total} khách hàng</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" className="h-8 px-2.5 text-xs" title="Xuất danh sách" onClick={() => exportCustomers(filtered)}>
            <Download size={14} />
          </Button>
          {perm.has('customer:create') && (
            <>
              {/* NÚT IMPORT CẬP NHẬT ĐỂ NHẬN CẢ EXCEL */}
              <Button
                variant="outline"
                className="h-8 px-2.5 text-xs"
                title="Nhập khách từ file Excel/CSV"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp size={14} />
              </Button>
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".csv, .xlsx, .xls"
                className="hidden" 
                onChange={handleImport} 
              />
              <Button className="h-8 gap-1 px-2.5 text-xs" onClick={() => setOpen(true)}>
                <Plus size={14} /> Thêm
              </Button>
            </>
          )}
        </div>
      </div>

      {importNote && (
        <p className="mx-4 mt-3 rounded-md border border-primary/30 bg-secondary px-3 py-2 text-xs">{importNote}</p>
      )}
      {error && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}

      <div className="border-b border-border px-3">
        <div className="-mt-0 flex items-center gap-1 overflow-x-auto">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative whitespace-nowrap px-2.5 py-2.5 text-xs font-medium ${tab === key ? 'text-primary' : 'text-muted-foreground'}`}
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
            placeholder="Tìm theo tên, mã KH, SĐT, email..."
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

      <div className="border-t border-border bg-card px-4">
        <Pagination 
          currentPage={page} 
          totalPages={meta.totalPages} 
          onPageChange={(newPage) => setPage(newPage)} 
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

      {/* Modal Thêm Khách Hàng */}
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
                  {['Website', 'Zalo', 'Facebook', 'Email', 'Giới thiệu', 'Danh sách công ty'].map((item) => <option key={item}>{item}</option>)}
                </select>
                <select className="crm-select w-full" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as 'lead' | 'active' | 'inactive' })}>
                  <option value="lead">Lead</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Ngừng hoạt động</option>
                </select>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                <Button onClick={addCustomer}>Lưu</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function CustomerListPane() {
  return (
    <Suspense fallback={<Loading text="Đang tải danh sách" />}>
      <ListPane />
    </Suspense>
  );
}