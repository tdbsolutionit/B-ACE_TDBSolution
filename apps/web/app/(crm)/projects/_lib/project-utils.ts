import ExcelJS from 'exceljs';

export const STATUS: Record<string, string> = { open: 'Đang thực hiện', won: 'Hoàn thành', lost: 'Tạm dừng' };

// --- BỔ SUNG LẠI MẢNG NÀY ---
export const PROJECT_EXPORT_COLS = [
  { key: 'code', label: 'Mã dự án' },
  { key: 'name', label: 'Tên dự án' },
  { key: 'customer', label: 'Khách hàng' },
  { key: 'stage', label: 'Giai đoạn' },
  { key: 'value', label: 'Giá trị (VND)' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'closeDate', label: 'Ngày dự kiến chốt' },
];
// -----------------------------

export function formatErrorMessage(err: any): string {
  const msg = err?.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_NETWORK')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng hoặc thử lại sau ít phút.';
  }
  if (msg.includes('401')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (msg.includes('403')) return 'Bạn không có quyền thực hiện thao tác này.';
  return msg || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export async function parseProjectFile(file: File): Promise<any[]> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        let formattedRows: any[] = [];

        if (isExcel) {
          const buffer = event.target?.result as ArrayBuffer;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          const worksheet = workbook.getWorksheet(1);
          if (!worksheet) return resolve([]);

          const headerMap: Record<string, number> = {};
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            if (cell.value) headerMap[String(cell.value).trim().toLowerCase()] = colNumber;
          });

          const getCellValue = (row: ExcelJS.Row, possibleNames: string[]) => {
            for (const name of possibleNames) {
              const colNumber = headerMap[name.toLowerCase()];
              if (colNumber) {
                const val = row.getCell(colNumber).text;
                return val ? val.trim() : '';
              }
            }
            return '';
          };

          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;

            let name = getCellValue(row, ['Tên dự án', 'Ten du an', 'name']);
            let code = getCellValue(row, ['Mã dự án', 'Ma du an', 'code']);

            if (!name) return;

            if (!code && /^\d{8}-\d{4}/.test(name)) {
              const match = name.match(/^(\d{8}-\d{4}_[^_]+_[^_]+_)/); 
              if (match) {
                code = match[1].replace(/_$/, ''); 
                name = name.replace(match[0], '').trim();
              }
            }

            formattedRows.push({
              code: code || null,
              name: name,
              customerName: getCellValue(row, ['Khách hàng', 'Khach hang', 'customer']),
              stageName: getCellValue(row, ['Giai đoạn', 'Giai doan', 'stage']),
              value: Number(getCellValue(row, ['Giá trị (VND)', 'Giá trị', 'value']).replace(/[^0-9]/g, '') || 0),
              probability: getCellValue(row, ['Xác suất (%)', 'Xác suất']) ? Number(getCellValue(row, ['Xác suất (%)', 'Xác suất']).replace(/[^0-9]/g, '') || 0) : 30,
              closeDate: getCellValue(row, ['Ngày dự kiến chốt', 'Ngày chốt', 'closeDate']),
              status: getCellValue(row, ['Trạng thái']).includes('Hoàn thành') ? 'won' : getCellValue(row, ['Trạng thái']).includes('Tạm dừng') ? 'lost' : 'open',
            });
          });
        } else {
          formattedRows = parseProjectCsv(event.target?.result as string);
        }
        resolve(formattedRows);
      } catch (err) {
        reject(err);
      }
    };
    
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file, 'UTF-8');
  });
}

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
      name: getVal(nameAt), customerName: getVal(customerAt), stageName: getVal(stageAt),
      value: Number(getVal(valueAt).replace(/[^0-9]/g, '') || 0), probability: 30,
      closeDate: getVal(dateAt), status: 'open',
    };
  }).filter((row) => row.name);
}

function splitCsv(line: string) {
  const cells: string[] = []; let current = ''; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i++; } else { quoted = !quoted; }
    } else if ((char === ',' || char === ';') && !quoted) {
      cells.push(current.trim()); current = '';
    } else { current += char; }
  }
  cells.push(current.trim()); return cells;
}