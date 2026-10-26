import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import ExcelJS from 'exceljs';

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

// --- EXPORT TO EXCEL ---
export async function exportToExcel(
  filename: string,
  rows: Record<string, any>[],
  columns: Array<{ key: string; label: string }>,
) {
  if (!rows || rows.length === 0) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet 1');

  worksheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: 20,
  }));

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC9A961' },
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

  rows.forEach((row) => {
    worksheet.addRow(row);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function convertNumberToVietnameseWords(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Không đồng';
  
  const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  const SCALES = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

  function readThreeDigits(num: number, isFull: boolean): string {
    let text = '';
    const hundreds = Math.floor(num / 100);
    const tens = Math.floor((num % 100) / 10);
    const units = num % 10;
    
    if (isFull || hundreds > 0) {
      text += ' ' + DIGITS[hundreds] + ' trăm';
      text += readTwoDigits(tens, units);
    } else {
      text += readTwoDigits(tens, units);
    }
    return text;
  }

  function readTwoDigits(tens: number, units: number): string {
    let text = '';
    if (tens > 1) {
      text += ' ' + DIGITS[tens] + ' mươi';
      if (units === 1) text += ' mốt';
    } else if (tens === 1) {
      text += ' mười';
      if (units === 1) text += ' một';
    } else if (units > 0) {
      text += ' lẻ';
    }
    
    if (units === 5 && tens >= 1) {
      text += ' lăm';
    } else if (units > 1 || (units === 1 && tens === 0)) {
      text += ' ' + DIGITS[units];
    }
    return text;
  }

  let remainingNumber = Math.round(Math.abs(amount));
  let scaleIndex = 0;
  let result = '';
  
  while (remainingNumber > 0) {
    const block = remainingNumber % 1000;
    if (block > 0) {
      const blockText = readThreeDigits(block, remainingNumber > 999);
      result = blockText + ' ' + SCALES[scaleIndex] + ' ' + result;
    }
    remainingNumber = Math.floor(remainingNumber / 1000);
    scaleIndex++;
  }
  
  result = result.trim().replace(/\s+/g, ' ');
  if (!result) return 'Không đồng';
  
  const capitalizedResult = result.charAt(0).toUpperCase() + result.slice(1);
  return `${capitalizedResult} đồng chẵn`;
}