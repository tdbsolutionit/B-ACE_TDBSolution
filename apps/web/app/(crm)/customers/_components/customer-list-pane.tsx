'use client';

import { Pagination } from '@/components/ui/pagination';
import { Loading } from '@/components/shared/loading';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import ExcelJS from 'exceljs';
import { api } from '@/lib/auth';
import { type CustomerRow, type PaginatedResponse } from '@/lib/crm';
import { exportToExcel } from '@/lib/utils';
import { useRealtime } from '@/lib/realtime';
import { CustomerTable } from '../_components/customer-table';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { toast } from '@/components/ui/toast';
import { usePermission } from '@/hooks/use-permission';

import { AddCustomerModal } from './add-customer-modal';
import { CustomerToolbar } from './customer-toolbar';

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

  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({ total: 0, page: 1, limit: 20, totalPages: 1, stats: { lead: 0, active: 0, hasOpp: 0 } });
  const limit = 20;

  const { on } = useRealtime();

  useEffect(() => { setPage(1); }, [tab, q]);

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
          }).catch(() => { });
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

  // --- CẬP NHẬT IMPORT EXCEL BẰNG EXCELJS ---
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!isExcel) {
      toast.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);

        const normalize = (s: string) =>
          String(s ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
        const targetSheetName = 'Khách hàng - Code';

        let worksheet =
          workbook.getWorksheet(targetSheetName) ||
          workbook.worksheets.find((ws) => normalize(ws.name) === normalize(targetSheetName)) ||
          workbook.worksheets[1] ||
          workbook.worksheets[0];

        if (!worksheet) throw new Error('File không có dữ liệu');

        const getCellText = (cell: ExcelJS.Cell): string => {
          const v: any = cell.value;
          if (v == null) return '';
          if (typeof v === 'object') {
            if ('result' in v && v.result != null) return String(v.result); // formula có cache
            if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
            if ('text' in v) return String(v.text);
            if (v instanceof Date) return v.toISOString();
            return '';
          }
          return String(v);
        };

        let headerRowNumber = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (headerRowNumber) return;
          row.eachCell({ includeEmpty: false }, (cell) => {
            const t = normalize(getCellText(cell));
            if (t === 'tên khách hàng' || t === 'stt' || t.includes('mã số')) {
              headerRowNumber = rowNumber;
            }
          });
        });
        if (!headerRowNumber) headerRowNumber = 1; // fallback

        const headerMap: Record<string, number> = {};
        worksheet.getRow(headerRowNumber).eachCell((cell, colNumber) => {
          const key = normalize(getCellText(cell));
          if (!key) return;
          if (headerMap[key] === undefined) headerMap[key] = colNumber;
        });

        const getCellValue = (row: ExcelJS.Row, possibleNames: string[]) => {
          for (const name of possibleNames) {
            const colNumber = headerMap[normalize(name)];
            if (colNumber) {
              const val = getCellText(row.getCell(colNumber)).trim();
              if (val && val !== 'N/A' && val !== 'NA') return val;
            }
          }
          return '';
        };

        const formattedRows: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return;

          const name = getCellValue(row, ['Tên khách hàng', 'Tên KH', 'Tên']);
          if (!name) return;

          let code = getCellValue(row, ['Mã', 'Mã khách hàng', 'Mã KH', 'code']);
          let shortCode = getCellValue(row, ['Mã số ( Code)', 'Mã số', 'shortCode']);
          if (shortCode && shortCode.startsWith('KH')) {
            shortCode = shortCode.replace(/^KH/, '').replace(/^0+/, '');
          }

          formattedRows.push({
            name,
            code: code || undefined,
            shortCode: shortCode || undefined,
            company: getCellValue(row, ['Thông tin khách hàng', 'Công ty']) || name,
            taxCode: getCellValue(row, ['MST', 'Mã số thuế']),
            address: getCellValue(row, ['Địa chỉ']),
            website: getCellValue(row, ['WEBSITE', 'Website']),
            industry: getCellValue(row, ['Lĩnh vực', 'Ngành nghề']),
            phone: getCellValue(row, ['Số điện thoại']),
            email: getCellValue(row, ['Email']),
            type: 'business',
            status: 'active',
            sourceName: 'Import File',
          });
        });

        if (!formattedRows.length) {
          toast.error('Không tìm thấy dữ liệu khách hàng hợp lệ trong file.');
          return;
        }

        const result = await api<{
          created: number;
          skipped: Array<{ name: string; reason: string }>;
        }>('/customers/import', {
          method: 'POST',
          body: JSON.stringify({ rows: formattedRows }),
        });

        const fresh = await api<{ data: CustomerRow[] }>('/customers');
        setRows(fresh.data || []);
        toast.success(`Đã import thành công ${result.created} khách hàng!`);
        if (result.skipped.length > 0) {
          toast.error(`Bỏ qua ${result.skipped.length} dòng do trùng SĐT/Email.`);
        }
      } catch (err: any) {
        console.error('[import] failed:', err);
        toast.error(err.message || 'Lỗi khi đọc file Excel');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const filtered = useMemo(() => {
    return (Array.isArray(rows) ? rows : []).filter((row) => {
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

  const CUSTOMER_EXPORT_COLS = [
    { key: 'name', label: 'Tên khách hàng' }, { key: 'company', label: 'Công ty' },
    { key: 'phone', label: 'Số điện thoại' }, { key: 'email', label: 'Email' },
    { key: 'address', label: 'Địa chỉ' }, { key: 'taxCode', label: 'Mã số thuế' },
    { key: 'industry', label: 'Ngành nghề' }, { key: 'type', label: 'Loại khách' },
    { key: 'status', label: 'Trạng thái' }, { key: 'sourceName', label: 'Nguồn' },
    { key: 'assigneeName', label: 'Người phụ trách' },
  ];

  async function exportCustomers(exportRows: CustomerRow[]) {
    if (!exportRows.length) return toast.error('Không có dữ liệu để xuất');
    await exportToExcel('danh-sach-khach-hang', exportRows, CUSTOMER_EXPORT_COLS);
    toast.success(`Đã xuất ${exportRows.length} khách hàng ra file Excel`);
  }

  async function handleBulkAssign(targetUserId: string) {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number; assigneeName: string }>('/customers/bulk-assign', {
        method: 'POST', body: JSON.stringify({ ids: selectedIds, assignedTo: targetUserId }),
      });
      setRows((prev) => prev.map((r) => (bulk.selected.has(r.id) ? { ...r, assigneeName: res.assigneeName } : r)));
      toast.success(`Đã gán ${res.count} khách cho ${res.assigneeName}`);
      bulk.clear();
    } catch (err: any) { toast.error(err.message || 'Lỗi khi gán khách hàng'); }
  }

  async function handleBulkStatus(newStatus: 'lead' | 'active' | 'inactive') {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number }>('/customers/bulk-status', {
        method: 'POST', body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      setRows((prev) => prev.map((r) => (bulk.selected.has(r.id) ? { ...r, status: newStatus } : r)));
      toast.success(`Đã cập nhật trạng thái cho ${res.count} khách`);
      bulk.clear();
    } catch (err: any) { toast.error(err.message || 'Lỗi khi cập nhật trạng thái'); }
  }

  async function handleBulkDelete() {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api<{ count: number }>('/customers/bulk-delete', {
        method: 'POST', body: JSON.stringify({ ids: selectedIds }),
      });
      setRows((prev) => prev.filter((r) => !bulk.selected.has(r.id)));
      toast.success(`Đã xóa ${selectedIds.length} khách hàng`);
      bulk.clear();
    } catch (err: any) { toast.error(err.message || 'Lỗi khi xóa khách hàng'); }
  }

  function handleBulkExport() {
    exportCustomers(rows.filter((r) => bulk.selected.has(r.id)));
  }

  const tabsData = [
    ['all', 'Tất cả', meta.total],
    ['lead', 'Lead', meta.stats?.lead || 0],
    ['has_opp', 'Có cơ hội', meta.stats?.hasOpp || 0],
    ['customer', 'Khách hàng', meta.stats?.active || 0],
  ] as const;

  const activeId = pathname.startsWith('customers/') ? pathname.split('/')[2] : undefined;

  return (
    <div className="flex h-full flex-col">
      <CustomerToolbar
        totalFiltered={filtered.length}
        totalMeta={meta.total}
        tab={tab}
        setTab={setTab}
        q={q}
        setQ={setQ}
        density={density}
        setDensity={setDensity}
        permHasCreate={perm.has('customer:create')}
        onExport={() => exportCustomers(filtered)}
        onImportClick={() => fileInputRef.current?.click()}
        onAddClick={() => setOpen(true)}
        fileInputRef={fileInputRef}
        onFileChange={handleImport}
        tabsData={tabsData}
      />

      {importNote && <p className="mx-4 mt-3 rounded-md border border-primary/30 bg-secondary px-3 py-2 text-xs">{importNote}</p>}
      {error && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}

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
        <Pagination currentPage={page} totalPages={meta.totalPages} onPageChange={(newPage) => setPage(newPage)} />
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

      <AddCustomerModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={(created) => setRows((current) => [created, ...current])}
      />
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