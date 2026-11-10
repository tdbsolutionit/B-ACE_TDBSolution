import { useState } from 'react';
import ExcelJS from 'exceljs';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

export function useCustomerImport(onSuccess: () => void) {
  const [isImporting, setIsImporting] = useState(false);

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
        setIsImporting(true);
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) throw new Error('File không có dữ liệu');

        const headerMap: Record<string, number> = {};
        worksheet.getRow(1).eachCell((cell, colNumber) => {
          if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
        });

        const getCellValue = (row: ExcelJS.Row, possibleNames: string[]) => {
          for (const name of possibleNames) {
            const colNumber = headerMap[name.toLowerCase()];
            if (colNumber) {
              const val = row.getCell(colNumber).text;
              if (val && val.trim() !== 'N/A') return val.trim();
            }
          }
          return '';
        };

        const formattedRows: any[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const name = getCellValue(row, ['Tên khách hàng', 'Tên KH', 'Tên']);
          if (!name) return;

          let code = getCellValue(row, ['Mã', 'Mã khách hàng', 'Mã KH', 'code']);
          let shortCode = getCellValue(row, ['Mã số ( Code)', 'Mã số', 'shortCode']);
          if (shortCode && shortCode.startsWith('KH')) shortCode = shortCode.replace('KH', '').replace(/^0+/, '');

          formattedRows.push({
            name, code: code || undefined, shortCode: shortCode || undefined,
            company: getCellValue(row, ['Thông tin khách hàng', 'Công ty']) || name,
            taxCode: getCellValue(row, ['MST', 'Mã số thuế']), address: getCellValue(row, ['Địa chỉ']),
            website: getCellValue(row, ['WEBSITE', 'Website']), industry: getCellValue(row, ['Lĩnh vực', 'Ngành nghề']),
            phone: getCellValue(row, ['Số điện thoại']), email: getCellValue(row, ['Email']),
            type: 'business', status: 'active', sourceName: 'Import File',
          });
        });

        if (!formattedRows.length) {
          toast.error('Không tìm thấy dữ liệu khách hàng hợp lệ trong file.');
          return;
        }

        const result = await api<{ created: number; skipped: Array<{ name: string; reason: string }> }>('/customers/import', {
          method: 'POST', body: JSON.stringify({ rows: formattedRows }),
        });

        toast.success(`Đã import thành công ${result.created} khách hàng!`);
        if (result.skipped.length > 0) toast.error(`Bỏ qua ${result.skipped.length} dòng do trùng SĐT/Email.`);
        onSuccess();
      } catch (err: any) {
        toast.error(err.message || 'Lỗi khi đọc file Excel');
      } finally {
        setIsImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return { isImporting, handleImport };
}