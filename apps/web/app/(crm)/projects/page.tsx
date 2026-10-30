'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/auth';
import { type CustomerRow, type ProjectRow, type StageRow } from '@/lib/crm';
import { exportToExcel } from '@/lib/utils';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';

import { STATUS, PROJECT_EXPORT_COLS, parseProjectFile } from './_lib/project-utils';
import { ProjectToolbar } from './_components/project-toolbar';
import { ProjectTable } from './_components/project-table';
import { CreateProjectModal } from './_components/create-project-modal';

export default function ProjectsPage() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    return api<ProjectRow[]>('/opportunities').then((res: any) => {
      setRows(Array.isArray(res) ? res : (res?.data || []));
    });
  }

  useEffect(() => {
    load().catch((err) => console.error(err));
    
    api<{ data: CustomerRow[] } | CustomerRow[]>('/customers')
      .then(res => {
        if (Array.isArray(res)) {
          setCustomers(res);
        } else if (res && Array.isArray(res.data)) {
          setCustomers(res.data);
        } else {
          setCustomers([]);
        }
      })
      .catch((err) => {
        console.error("Lỗi tải danh sách khách hàng:", err);
        setCustomers([]);
      });

    api<StageRow[]>('/opportunities/stages').then(res => setStages(Array.isArray(res) ? res : [])).catch(() => setStages([]));
    api<Array<{ id: string; name: string; role?: string }>>('/users').then(res => setUsers(Array.isArray(res) ? res : [])).catch(() => setUsers([]));
  }, []);

  async function handleExport() {
    if (!rows || rows.length === 0) return toast.error('Không có dữ liệu để xuất');
    const formattedRows = rows.map(row => ({ ...row, status: STATUS[row.status] || row.status }));
    await exportToExcel('/dealsdu-an', formattedRows, PROJECT_EXPORT_COLS);
    toast.success('Đã xuất file Excel thành công');
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Gọi hàm helper đã viết ở file project-utils.ts
      const formattedRows = await parseProjectFile(file);

      if (!formattedRows.length) {
        toast.error('File trống hoặc không đúng định dạng. Vui lòng kiểm tra lại.');
        return;
      }

      const res = await api<{ created: number, skipped: any[] }>('/opportunities/import', {
        method: 'POST',
        body: JSON.stringify({ rows: formattedRows })
      });

      await load(); 
      
      if (res.created > 0) toast.success(`Đã import thành công ${res.created} dự án!`);
      
      if (res.skipped.length > 0) {
        const firstError = res.skipped[0]?.reason || 'Không rõ lý do';
        toast.error(`Bỏ qua ${res.skipped.length} dòng. Lý do: ${firstError}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi khi đọc file. Vui lòng kiểm tra lại.');
    } finally {
      e.target.value = '';
    }
  };

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    
    try {
      await api<ProjectRow>('/opportunities', {
        method: 'POST',
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          code: String(data.get('code') || '') || undefined,
          customerId: String(data.get('customerId') || ''),
          stageId: String(data.get('stageId') || ''),
          value: Number(data.get('value') || 0),
          probability: 100,
          expectedCloseDate: String(data.get('closeDate') || ''),
        }),
      });
      toast.success('Thêm dự án thành công');
      setOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
    }
  }

  const filteredRows = (Array.isArray(rows) ? rows : []).filter(r =>
    r.name.toLowerCase().includes(q.toLowerCase()) ||
    (r.customer && r.customer.toLowerCase().includes(q.toLowerCase()))
  );

  const bulk = useBulkSelection(filteredRows);

  async function handleBulkDelete() {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api('/opportunities/bulk-delete', { method: 'POST', body: JSON.stringify({ ids: selectedIds }) });
      setRows((prev) => prev.filter((r) => !bulk.selected.has(r.id)));
      toast.success(`Đã xóa ${selectedIds.length} dự án`);
      bulk.clear();
    } catch (err: any) { console.error(err); }
  }

  async function handleBulkStatus(newStatus: 'open' | 'won' | 'lost') {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api('/opportunities/bulk-status', { method: 'POST', body: JSON.stringify({ ids: selectedIds, status: newStatus }) });
      setRows((prev) => prev.map((r) => (bulk.selected.has(r.id) ? { ...r, status: newStatus } : r)));
      toast.success(`Đã cập nhật trạng thái cho ${selectedIds.length} dự án`);
      bulk.clear();
    } catch (err: any) { console.error(err); }
  }

  async function handleBulkAssign(targetUserId: string) {
    try {
      const selectedIds = Array.from(bulk.selected);
      const res = await api<{ count: number; assigneeName: string }>('/opportunities/bulk-assign', {
        method: 'POST', body: JSON.stringify({ ids: selectedIds, assignedTo: targetUserId }),
      });
      toast.success(`Đã gán ${res.count} dự án cho ${res.assigneeName}`);
      bulk.clear();
      await load();
    } catch (err: any) { console.error(err); }
  }

  async function handleBulkExport() {
    const selectedRows = rows.filter((r) => bulk.selected.has(r.id));
    const formattedRows = selectedRows.map(row => ({ ...row, status: STATUS[row.status] || row.status }));
    await exportToExcel('danh-sach-du-an-da-chon', formattedRows, PROJECT_EXPORT_COLS);
    toast.success(`Đã xuất ${selectedRows.length} dự án`);
  }

  return (
    <>
      <ProjectToolbar
        q={q}
        setQ={setQ}
        onExport={handleExport}
        onImportClick={() => fileInputRef.current?.click()}
        onAddClick={() => setOpen(true)}
        fileInputRef={fileInputRef}
        onFileChange={handleImport}
      />
      <ProjectTable rows={filteredRows} bulk={bulk} />
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
      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={create}
        customers={customers}
        stages={stages}
      />
    </>
  );
}