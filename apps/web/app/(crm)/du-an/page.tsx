'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney, exportToExcel } from '@/lib/utils';
import { Download, FileUp, Search } from 'lucide-react';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';

const STATUS: Record<string, string> = { open: 'Đang thực hiện', won: 'Hoàn thành', lost: 'Tạm dừng' };

const PROJECT_EXPORT_COLS = [
  { key: 'code', label: 'Mã dự án' },
  { key: 'name', label: 'Tên dự án' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'stage', label: 'Giai đoạn' },
  { key: 'value', label: 'Giá trị (VND)' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'closeDate', label: 'Ngày dự kiến chốt' },
];

export default function ProjectsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [q, setQ] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    return api<ProjectRow[]>('/opportunities').then(setRows);
  }

  // GỘP CHUNG 1 USE_EFFECT DUY NHẤT ĐỂ TRÁNH GỌI API 2 LẦN
  useEffect(() => {
    load().catch((err: Error) => setError(formatErrorMessage(err)));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
    api<Array<{ id: string; name: string; role?: string }>>('/users').then(setUsers).catch(() => setUsers([]));
  }, []);

  function handleExport() {
    if (!rows || rows.length === 0) return setError('Không có dữ liệu để xuất');
    const formattedRows = rows.map(row => ({ ...row, status: STATUS[row.status] || row.status }));
    exportToExcel('danh-sach-du-an', formattedRows, PROJECT_EXPORT_COLS);
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let formattedRows: any[] = [];
        const bstr = event.target?.result;

        if (isExcel) {
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          
          formattedRows = data.map(row => {
            const getVal = (keys: string[]) => {
              for (const key of keys) {
                const matchedKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase());
                if (matchedKey && row[matchedKey] !== undefined) return String(row[matchedKey]).trim();
              }
              return '';
            };

            let name = getVal(['Tên dự án', 'Ten du an', 'name']);
            let code = getVal(['Mã dự án', 'Ma du an', 'code']);

            // Nếu Tên dự án bắt đầu bằng mã dự án (dạng 20240221-...), tự động tách ra
            if (!code && /^\d{8}-\d{4}/.test(name)) {
              const match = name.match(/^(\d{8}-\d{4}_[^_]+_[^_]+_)/); // Tách phần đầu làm mã
              if (match) {
                code = match[1].replace(/_$/, ''); // Xóa dấu _ ở cuối
                name = name.replace(match[0], '').trim(); // Phần còn lại làm tên
              }
            }

            if (!name) return null;

            return {
              code: code || null, // Gửi mã dự án lên backend
              name: name,
              customerName: getVal(['Khách hàng', 'Khach hang', 'customer']),
              stageName: getVal(['Giai đoạn', 'Giai doan', 'stage']),
              value: Number(getVal(['Giá trị (VND)', 'Giá trị', 'value']).replace(/[^0-9]/g, '') || 0),
              probability: getVal(['Xác suất (%)', 'Xác suất']) ? Number(getVal(['Xác suất (%)', 'Xác suất']).replace(/[^0-9]/g, '') || 0) : 30,
              closeDate: getVal(['Ngày dự kiến chốt', 'Ngày chốt', 'closeDate']),
              status: getVal(['Trạng thái']).includes('Hoàn thành') ? 'won' : getVal(['Trạng thái']).includes('Tạm dừng') ? 'lost' : 'open',
            };
          }).filter(Boolean);
        } else {
          const text = bstr as string;
          formattedRows = parseProjectCsv(text);
        }

        if (!formattedRows.length) {
          toast.error('File trống hoặc không đúng định dạng. Vui lòng kiểm tra lại cột Tên dự án.');
          return;
        }

        const res = await api<{ created: number, skipped: any[] }>('/opportunities/import', {
          method: 'POST',
          body: JSON.stringify({ rows: formattedRows })
        });

        await load(); 
        
        if (res.created > 0) {
          toast.success(`Đã import thành công ${res.created} dự án!`);
        }
        
        if (res.skipped.length > 0) {
          console.log('Danh sách dòng lỗi:', res.skipped);
          // Hiển thị rõ lý do lỗi ra màn hình
          const firstError = res.skipped[0]?.reason || 'Không rõ lý do';
          toast.error(`Bỏ qua ${res.skipped.length} dòng. Lý do: ${firstError}`);
        }
        
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi đọc file');
      }
    };

    if (isExcel) reader.readAsBinaryString(file);
    else reader.readAsText(file, 'UTF-8');
    
    e.target.value = ''; 
  };

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await api<ProjectRow>('/opportunities', {
      method: 'POST',
      body: JSON.stringify({
        name: String(data.get('name') || ''),
        customerId: String(data.get('customerId') || ''),
        stageId: String(data.get('stageId') || ''),
        value: Number(data.get('value') || 0),
        probability: 100,
        expectedCloseDate: String(data.get('closeDate') || ''),
      }),
    });
    setOpen(false);
    load();
  }

  const filteredRows = rows.filter(r =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    (r.customer && r.customer.toLowerCase().includes(q.toLowerCase()))
  );

  // --- KHU VỰC BULK ACTIONS ---
  const bulk = useBulkSelection(filteredRows);

  async function handleBulkDelete() {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api('/opportunities/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      setRows((prev) => prev.filter((r) => !bulk.selected.has(r.id)));
      toast.success(`Đã xóa ${selectedIds.length} dự án`);
      bulk.clear();
    } catch (err: any) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function handleBulkStatus(newStatus: 'open' | 'won' | 'lost') {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api('/opportunities/bulk-status', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, status: newStatus }),
      });
      setRows((prev) =>
        prev.map((r) => (bulk.selected.has(r.id) ? { ...r, status: newStatus } : r))
      );
      toast.success(`Đã cập nhật trạng thái cho ${selectedIds.length} dự án`);
      bulk.clear();
    } catch (err: any) {
      toast.error(formatErrorMessage(err));
    }
  }

  async function handleBulkAssign(targetUserId: string) {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number; assigneeName: string }>('/opportunities/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds, assignedTo: targetUserId }),
      });

      toast.success(`Đã gán ${res.count} dự án cho ${res.assigneeName}`);
      bulk.clear();

      // Gọi lại load() để lấy dữ liệu mới nhất thay vì tự gán bằng tay
      await load();
    } catch (err: any) {
      toast.error(formatErrorMessage(err));
    }
  }

  function handleBulkExport() {
    const selectedRows = rows.filter((r) => bulk.selected.has(r.id));
    const formattedRows = selectedRows.map(row => ({ ...row, status: STATUS[row.status] || row.status }));
    exportToExcel('danh-sach-du-an-da-chon', formattedRows, PROJECT_EXPORT_COLS);
    toast.success(`Đã xuất ${selectedRows.length} dự án`);
  }

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Quản lý Dự án</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Theo dõi tiến độ thực thi, hồ sơ và tài liệu dự án.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExport} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
            <Download size={16} className="mr-2" /> Xuất
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
          >
            <FileUp size={16} className="mr-2" /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={handleImport}
          />
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            + Thêm dự án
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mt-0.5">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {importNote && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          {importNote}
        </div>
      )}

      {/* Thanh công cụ Lọc/Tìm kiếm */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-[250px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <input
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Tìm mã dự án, tên, khách hàng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Bảng Dữ liệu Dự án */}
      <section className="data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-12 text-center">
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={bulk.isAllSelected}
                  onChange={bulk.isAllSelected ? bulk.clear : bulk.selectAll}
                />
              </th>
              <th className="px-4 py-3 font-semibold">Mã dự án</th>
              <th className="px-4 py-3 font-semibold">Tên dự án</th>
              <th className="px-4 py-3 font-semibold">Khách hàng</th>
              <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
              <th className="px-4 py-3 font-semibold text-right">Giá trị</th>
              <th className="px-4 py-3 font-semibold text-right">Ngày chốt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((project) => (
              <tr
                key={project.id}
                className={`group cursor-pointer hover:bg-muted/30 transition-colors ${bulk.selected.has(project.id) ? 'bg-muted/50' : ''}`}
                onClick={() => router.push(`/du-an/${project.id}`)}
              >
                <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={bulk.selected.has(project.id)}
                    onChange={() => bulk.toggle(project.id)}
                  />
                </td>

                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-primary truncate block max-w-[250px]" title={project.code || ''}>
                    {project.code || '—'}
                  </span>
                </td>

                <td className="px-4 py-3 font-medium text-foreground truncate max-w-[250px]">
                  {project.name}
                </td>

                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {project.customer || '—'}
                </td>

                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${project.status === 'won' ? 'bg-green-100 text-green-700' :
                    project.status === 'lost' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                    {STATUS[project.status]}
                  </span>
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  {project.value > 0 ? compactMoney(project.value) : <span className="text-muted-foreground/50">—</span>}
                </td>

                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {project.closeDate || <span className="text-muted-foreground/50">—</span>}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Chưa có dự án nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Thanh Bulk Action */}
      <BulkActionBar
        count={bulk.count}
        users={users}
        entityName="dự án"
        onClear={bulk.clear}
        onAssign={handleBulkAssign}
        onChangeStatus={handleBulkStatus}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
      />

      {/* Modal Thêm Dự Án */}
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={create}>
            <h2 className="text-base font-semibold">Thêm dự án thực thi</h2>
            <div className="mt-4 grid gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tên dự án <span className="text-destructive">*</span></label>
                <input name="name" required className="h-10 rounded-md border border-input px-3 text-sm" />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Khách hàng <span className="text-destructive">*</span></label>
                <select name="customerId" required className="crm-select">
                  <option value="">Chọn khách hàng</option>
                  {customers.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                </select>
              </div>
              <div className="mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-md border px-4 text-sm">Hủy</button>
                <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground">Tạo dự án</button>
              </div>
            </div>
          </form>
        </>
      )}
    </>
  );
}

// --- CÁC HÀM HELPER XỬ LÝ LỖI VÀ CSV ---
function formatErrorMessage(err: any): string {
  const msg = err?.message || String(err);

  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_NETWORK')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng hoặc thử lại sau ít phút.';
  }
  if (msg.includes('401')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (msg.includes('403')) return 'Bạn không có quyền thực hiện thao tác này.';

  return msg || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// --- CÁC HÀM HELPER XỬ LÝ CSV ---
function parseProjectCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  
  const header = splitCsv(lines[0]).map((cell) => cell.toLowerCase().trim());
  const find = (...names: string[]) => header.findIndex((cell) => names.some((name) => cell.includes(name)));
  
  const nameAt = find('tên dự án', 'ten du an', 'name', 'dự án');
  const customerAt = find('khách hàng', 'khach hang', 'customer');
  const stageAt = find('giai đoạn', 'giai doan', 'stage');
  const valueAt = find('giá trị', 'gia tri', 'value');
  const dateAt = find('ngày dự kiến chốt', 'ngày chốt', 'ngay chot', 'close date');

  return lines.slice(1).map((line) => {
    const cells = splitCsv(line);
    const getVal = (index: number) => index >= 0 ? (cells[index] || '').trim() : '';

    return {
      name: getVal(nameAt),
      customerName: getVal(customerAt),
      stageName: getVal(stageAt),
      value: Number(getVal(valueAt).replace(/[^0-9]/g, '') || 0),
      probability: 30, // Mặc định nếu file csv không có
      closeDate: getVal(dateAt),
      status: 'open',
    };
  }).filter((row) => row.name && row.customerName);
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