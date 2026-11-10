import { useState } from 'react';
import { api } from '@/lib/auth';
import { exportToExcel } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { type CustomerRow, type PaginatedResponse } from '@/lib/crm';

const CUSTOMER_EXPORT_COLS = [
  { key: 'name', label: 'Tên khách hàng' }, { key: 'company', label: 'Công ty' },
  { key: 'phone', label: 'Số điện thoại' }, { key: 'email', label: 'Email' },
  { key: 'address', label: 'Địa chỉ' }, { key: 'taxCode', label: 'Mã số thuế' },
  { key: 'industry', label: 'Ngành nghề' }, { key: 'type', label: 'Loại khách' },
  { key: 'status', label: 'Trạng thái' }, { key: 'sourceName', label: 'Nguồn' },
  { key: 'assigneeName', label: 'Người phụ trách' },
];

export function useCustomerExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportAllCustomers = async (q: string, tab: string, sortBy: string, sortOrder: string) => {
    try {
      setIsExporting(true);
      const res = await api<PaginatedResponse<CustomerRow>>(`/customers?page=1&limit=10000&q=${q}&tab=${tab}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
      const allData = res.data || [];
      
      if (!allData.length) {
        toast.error('Không có dữ liệu để xuất');
        return;
      }
      
      await exportToExcel('danh-sach-khach-hang', allData, CUSTOMER_EXPORT_COLS);
      toast.success(`Đã xuất ${allData.length} khách hàng ra file Excel`);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xuất dữ liệu');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSelectedCustomers = async (rows: CustomerRow[], selectedIds: Set<string>) => {
    const selectedRows = rows.filter((r) => selectedIds.has(r.id));
    if (!selectedRows.length) return toast.error('Không có dữ liệu để xuất');
    
    await exportToExcel('danh-sach-khach-hang', selectedRows, CUSTOMER_EXPORT_COLS);
    toast.success(`Đã xuất ${selectedRows.length} khách hàng ra file Excel`);
  };

  return { isExporting, exportAllCustomers, exportSelectedCustomers };
}