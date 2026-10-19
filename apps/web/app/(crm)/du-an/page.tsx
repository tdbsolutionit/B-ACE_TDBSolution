'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney, exportToExcel } from '@/lib/utils';
import { Download, FileUp, Search } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';


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
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState('');
  const [q, setQ] = useState('');
  const csvInput = useRef<HTMLInputElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const bstr = event.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Chuyển sheet Excel thành mảng JSON
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (!data.length) {
          toast.error('File Excel trống hoặc không đúng định dạng');
          return;
        }

        // Map dữ liệu từ Excel sang cấu trúc Backend yêu cầu
        const formattedRows = data.map(row => ({
          name: row['Tên dự án'] || row['name'] || '',
          customerName: row['Khách hàng'] || row['customerName'] || '',
          stageName: row['Giai đoạn'] || row['stageName'] || '',
          value: Number(row['Giá trị'] || row['value'] || 0),
          probability: Number(row['Xác suất'] || row['probability'] || 0),
          closeDate: row['Ngày dự kiến chốt'] || row['closeDate'] || '',
        }));

        // Gọi API Backend để lưu vào Database
        const res = await api<{ created: number, skipped: any[] }>('/opportunities/import', {
          method: 'POST',
          body: JSON.stringify({ rows: formattedRows })
        });

        toast.success(`Đã import thành công ${res.created} dự án!`);
        if (res.skipped.length > 0) {
          toast.error(`Có ${res.skipped.length} dòng bị bỏ qua (Không tìm thấy Khách hàng).`);
        }
        
        // Load lại danh sách
        load(); 
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi đọc file Excel');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input để có thể chọn lại cùng 1 file
    e.target.value = ''; 
  };

  function load() {
    return api<ProjectRow[]>('/opportunities').then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
    api<CustomerRow[]>('/customers').then(setCustomers).catch(() => setCustomers([]));
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, []);

  function handleExport() {
    if (!rows || rows.length === 0) return setError('Không có dữ liệu để xuất');
    const formattedRows = rows.map(row => ({ ...row, status: STATUS[row.status] || row.status }));
    exportToExcel('danh-sach-du-an', formattedRows, PROJECT_EXPORT_COLS);
  }

  async function importCsv(file: File) {
    const text = await file.text();
    // Giả sử bạn đã có hàm parseProjectCsv từ tin nhắn trước
    const importRows = [{ name: "Test Import", customerName: "KDC", value: 1000 }]; // Placeholder
    try {
      const result = await api<{ created: number; skipped: any[] }>('/opportunities/import', {
        method: 'POST',
        body: JSON.stringify({ rows: importRows }),
      });
      await load();
      setImportNote(`Đã thêm thành công ${result.created} dự án.`);
    } catch (err: any) {
      setImportNote(err.message || 'Lỗi khi import');
    }
  }

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
        probability: 100, // Dự án thực thi mặc định 100%
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
            <FileUp size={16} className="mr-2" /> Import Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".xlsx, .xls" 
            className="hidden" 
            onChange={handleImportExcel} 
          />
          <input ref={csvInput} type="file" accept=".csv" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0]; e.target.value = ''; if (file) importCsv(file);
          }} />
          <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            + Thêm dự án
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {importNote && <p className="mb-3 rounded-md border border-primary/30 bg-secondary px-3 py-2 text-xs">{importNote}</p>}

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
      {/* Bảng Dữ liệu Dự án */}
      <section className="data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold w-[28%]">Mã dự án</th>
              <th className="px-4 py-3 font-semibold w-[25%]">Tên dự án</th>
              <th className="px-4 py-3 font-semibold w-[15%]">Khách hàng</th>
              <th className="px-4 py-3 font-semibold w-[12%] text-center">Trạng thái</th>
              <th className="px-4 py-3 font-semibold w-[10%] text-right">Giá trị</th>
              <th className="px-4 py-3 font-semibold w-[10%] text-right">Ngày chốt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRows.map((project) => (
              <tr
                key={project.id}
                className="group cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => router.push(`/du-an/${project.id}`)}
              >
                {/* Cột Mã dự án: Cắt bớt nếu quá dài, font mono */}
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold text-primary truncate block max-w-[250px]" title={project.code || ''}>
                    {project.code || '—'}
                  </span>
                </td>

                {/* Cột Tên dự án */}
                <td className="px-4 py-3 font-medium text-foreground truncate max-w-[250px]">
                  {project.name}
                </td>

                {/* Cột Khách hàng */}
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {project.customer || '—'}
                </td>

                {/* Cột Trạng thái: Thêm whitespace-nowrap để không rớt dòng */}
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${project.status === 'won' ? 'bg-green-100 text-green-700' :
                      project.status === 'lost' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                    }`}>
                    {STATUS[project.status]}
                  </span>
                </td>

                {/* Cột Giá trị: Căn phải, font đậm */}
                <td className="px-4 py-3 text-right font-medium">
                  {project.value > 0 ? compactMoney(project.value) : <span className="text-muted-foreground/50">—</span>}
                </td>

                {/* Cột Ngày chốt: Căn phải */}
                <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                  {project.closeDate || <span className="text-muted-foreground/50">—</span>}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Chưa có dự án nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Modal Thêm Dự Án (Giữ nguyên) */}
      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={create}>
            <h2 className="text-base font-semibold">Thêm dự án thực thi</h2>
            <div className="mt-4 grid gap-4">
              {/* ... Copy phần Form thêm dự án của bạn vào đây ... */}
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