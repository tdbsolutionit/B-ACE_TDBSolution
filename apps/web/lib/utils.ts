import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(-2);
  return parts.map((part) => part[0] || '').join('').toUpperCase() || '?';
}

export function vnd(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value)) + ' ₫';
}

export function compactMoney(value: number) {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2).replace('.', ',') + ' tỷ ₫';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + ' tr ₫';
  return vnd(value);
}

export function roleLabel(role: string) {
  if (role === 'admin') return 'Quản trị viên';
  if (role === 'manager') return 'Quản lý';
  return 'Sales';
}

export function exportToCsv(
  filename: string,
  rows: Record<string, any>[],
  columns: Array<{ key: string; label: string }>,
) {
  if (!rows || rows.length === 0) return;

  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = columns.map((col) => escapeCell(col.label)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((col) => escapeCell(row[col.key])).join(','),
  );

  // sep=, tells Excel explicitly to split by comma instead of putting in 1 column
  const csvContent = '\uFEFFsep=,\r\n' + [headerRow, ...dataRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Xuất dữ liệu sang định dạng Excel (.xls) chuẩn bảng tính,
 * đảm bảo 100% mở bằng Excel các cột được phân tách rõ ràng, có viền và màu tiêu đề.
 */
export function exportToExcel(
  filename: string,
  rows: Record<string, any>[],
  columns: Array<{ key: string; label: string }>,
) {
  if (!rows || rows.length === 0) return;

  const thHtml = columns
    .map(
      (c) =>
        `<th style="background-color:#C9A961;color:#ffffff;font-weight:bold;padding:10px;border:1px solid #b3934b;text-align:left;">${c.label}</th>`,
    )
    .join('');

  const trHtml = rows
    .map((row) => {
      const td = columns
        .map((c) => {
          const val = row[c.key] ?? '';
          return `<td style="padding:8px 10px;border:1px solid #e2e8f0;font-size:13px;">${String(val).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
        })
        .join('');
      return `<tr>${td}</tr>`;
    })
    .join('');

  const template = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Khách hàng</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
      </style>
    </head>
    <body>
      <table>
        <thead><tr>${thHtml}</tr></thead>
        <tbody>${trHtml}</tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + template], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Đọc số tiền thành chữ Tiếng Việt */
export function docSoTien(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Không đồng';
  const ChuSo = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const Tien = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function docBlock3(so: number, daydu: boolean): string {
    let chuoi = '';
    const tram = Math.floor(so / 100);
    const chuc = Math.floor((so % 100) / 10);
    const donvi = so % 10;
    if (daydu || tram > 0) {
      chuoi += ' ' + ChuSo[tram] + ' trăm';
      chuoi += docChuc(chuc, donvi);
    } else {
      chuoi += docChuc(chuc, donvi);
    }
    return chuoi;
  }

  function docChuc(chuc: number, donvi: number): string {
    let chuoi = '';
    if (chuc > 1) {
      chuoi += ' ' + ChuSo[chuc] + ' mươi';
      if (donvi === 1) chuoi += ' mốt';
    } else if (chuc === 1) {
      chuoi += ' mười';
      if (donvi === 1) chuoi += ' một';
    } else if (donvi > 0) {
      chuoi += ' lẻ';
    }
    if (donvi === 5 && chuc >= 1) {
      chuoi += ' lăm';
    } else if (donvi > 1 || (donvi === 1 && chuc === 0)) {
      chuoi += ' ' + ChuSo[donvi];
    }
    return chuoi;
  }

  let so = Math.round(Math.abs(amount));
  let i = 0;
  let ketqua = '';
  while (so > 0) {
    const block = so % 1000;
    if (block > 0) {
      const chuoiBlock = docBlock3(block, so > 999);
      ketqua = chuoiBlock + ' ' + Tien[i] + ' ' + ketqua;
    }
    so = Math.floor(so / 1000);
    i++;
  }
  ketqua = ketqua.trim().replace(/\s+/g, ' ');
  if (!ketqua) return 'Không đồng';
  const capitalized = ketqua.charAt(0).toUpperCase() + ketqua.slice(1);
  return `${capitalized} đồng chẵn`;
}

