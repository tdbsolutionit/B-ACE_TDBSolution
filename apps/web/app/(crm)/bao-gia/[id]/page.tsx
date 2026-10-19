'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileDown, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/auth';
import { docSoTien, vnd } from '@/lib/utils';
import { toast } from '@/components/ui/toast';

type Line = { id?: string; moduleName: string; quantity: number; unitPrice: number; total?: number };

type Quote = {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  createdAt?: string;
  profitMargin: number;
  personnelCost: number;
  otherCost: number;
  totalCost: number;
  sellingPrice: number;
  customer: {
    name: string;
    company?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    email?: string | null;
    taxCode?: string | null;
  };
  opportunity: { id: string; name: string };
  items?: Line[];
};

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
const LABEL: Record<string, string> = { draft: 'Nháp', sent: 'Đã gửi', accepted: 'Chấp nhận', rejected: 'Từ chối', expired: 'Hết hạn' };

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [margin, setMargin] = useState(50);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function load() {
    return api<Quote>(`/quotes/${params.id}`).then((row) => {
      setQuote(row);
      setMargin(Number(row.profitMargin) || 0);
      const items = (row.items || []).map((item) => ({
        id: item.id,
        moduleName: item.moduleName,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
      }));
      setLines(items.length ? items : [{ moduleName: 'Hạng mục', quantity: 1, unitPrice: Number(row.totalCost) || 0 }]);
    });
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [params.id]);

  async function setStatus(status: string) {
    try {
      setError('');
      await api(`/quotes/${params.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast.success(`Đã cập nhật trạng thái: ${LABEL[status] || status}`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi cập nhật trạng thái');
      toast.error(err.message || 'Lỗi khi cập nhật trạng thái');
    }
  }

  async function saveLines() {
    const updated = await api<Quote>(`/quotes/${params.id}/items`, {
      method: 'PATCH',
      body: JSON.stringify({
        profitMargin: margin,
        items: lines.map((line) => ({
          moduleName: line.moduleName,
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
        })),
      }),
    });
    setQuote((current) => current ? { ...current, ...updated, items: updated.items } : current);
    setSaved(true);
  }

  const cost = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0), 0);
  const price = Math.round(cost / (1 - (Number(margin) || 0) / 100));

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!quote) return <p className="text-sm text-muted-foreground">Đang tải báo giá…</p>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={quote.opportunity ? `/du-an/${quote.opportunity.id}` : '/bao-gia'} className="text-xs text-muted-foreground">← Dự án</Link>
          <h1 className="mt-3 font-display text-[28px] font-bold">{quote.quoteNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{quote.title} · {quote.customer?.name} · {quote.opportunity?.name}</p>
        </div>
        
        {/* NÚT XUẤT PDF ĐÃ CÓ SẴN Ở ĐÂY */}
        <button 
          type="button" 
          onClick={() => printQuote(quote, lines, margin, price)} 
          className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-secondary px-4 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <FileDown size={16} /> Xuất PDF / In báo giá
        </button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => (
          <button key={status} type="button" onClick={() => setStatus(status)} className={quote.status === status ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground' : 'rounded-full border px-3 py-1 text-xs hover:bg-accent'}>
            {LABEL[status]}
          </button>
        ))}
      </div>

      <section className="data-panel mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Hạng mục</h2>
          <button type="button" onClick={() => setLines((current) => [...current, { moduleName: '', quantity: 1, unitPrice: 0 }])} className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs">
            <Plus size={14} /> Thêm dòng
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={line.id || index} className="grid grid-cols-[1fr_88px_140px_36px] gap-2">
              <input value={line.moduleName} onChange={(event) => updateLine(setLines, index, { moduleName: event.target.value })} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tên hạng mục" />
              <input type="number" min={0} value={line.quantity} onChange={(event) => updateLine(setLines, index, { quantity: Number(event.target.value) })} className="h-10 rounded-md border border-input px-3 text-sm" />
              <input type="number" min={0} value={line.unitPrice} onChange={(event) => updateLine(setLines, index, { unitPrice: Number(event.target.value) })} className="h-10 rounded-md border border-input px-3 text-sm" />
              <button type="button" className="inline-flex items-center justify-center text-muted-foreground" onClick={() => setLines((current) => current.filter((_, item) => item !== index))}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
          <label className="text-xs text-muted-foreground">
            Biên lợi nhuận %
            <input type="number" min={0} value={margin} onChange={(event) => setMargin(Number(event.target.value))} className="mt-1 block h-10 w-28 rounded-md border border-input px-3 text-sm text-foreground" />
          </label>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Chi phí {vnd(cost)}</p>
            <p className="mt-1 text-lg font-semibold text-primary">{vnd(price)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-success">Đã lưu hạng mục</span>}
          <button type="button" onClick={() => saveLines().catch((err: Error) => setError(err.message))} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Lưu hạng mục</button>
        </div>
      </section>
    </>
  );
}

function updateLine(setLines: React.Dispatch<React.SetStateAction<Line[]>>, index: number, patch: Partial<Line>) {
  setLines((current) => current.map((line, item) => (item === index ? { ...line, ...patch } : line)));
}

function printQuote(quote: Quote, lines: Line[], margin: number, price: number) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const multiplier = 1 + (Number(margin) || 0) / 100;
  let subtotal = 0;

  const rows = lines.map((line, idx) => {
    const rawCost = Number(line.unitPrice) || 0;
    const sellUnit = Math.round(rawCost * multiplier);
    const qty = Number(line.quantity) || 1;
    const lineTotal = sellUnit * qty;
    subtotal += lineTotal;
    const code = `T0301${String(idx + 1).padStart(4, '0')}`;
    return `
      <tr>
        <td style="text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
        <td style="text-align:center;font-weight:600;">${code}</td>
        <td>${escapeHtml(line.moduleName || 'Hạng mục')}</td>
        <td style="text-align:center;">Gói</td>
        <td style="text-align:right;">${vnd(sellUnit)}</td>
        <td style="text-align:center;">${String(qty).padStart(2, '0')}</td>
        <td style="text-align:right;font-weight:600;">${vnd(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const vat = Math.round(subtotal * 0.08);
  const grandTotal = subtotal + vat;
  const inWords = docSoTien(grandTotal);

  const customerName = quote.customer?.contactName || quote.customer?.name || '';
  const customerCompany = quote.customer?.company || quote.customer?.name || '';
  const customerAddress = quote.customer?.address || '—';

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>BÁO GIÁ - ${escapeHtml(quote.quoteNumber)}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Times New Roman", serif; color: #1f2937; margin: 0; padding: 20px; font-size: 13px; line-height: 1.5; background: #fff; }
    .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .company-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-bottom: 4px; text-transform: uppercase; }
    .company-info { font-size: 11.5px; color: #475569; line-height: 1.4; }
    .divider { height: 2px; background: #C9A961; margin: 10px 0 16px; }
    .quote-title { text-align: center; font-size: 20px; font-weight: bold; color: #0f172a; margin: 12px 0 4px; }
    .quote-meta { text-align: right; font-size: 12px; margin-bottom: 12px; }
    .customer-box { margin-bottom: 16px; font-size: 12.5px; }
    .customer-box table { width: 100%; border-collapse: collapse; }
    .customer-box td { padding: 2px 0; }
    .intro-text { font-style: italic; font-size: 12px; color: #475569; margin-bottom: 10px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .items-table th, .items-table td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
    .items-table th { background: #f8fafc; font-weight: 600; text-align: center; }
    .sub-th { font-size: 10px; font-weight: normal; color: #64748b; font-style: italic; }
    .total-row td { font-weight: 600; border: 1px solid #cbd5e1; }
    .in-words { font-weight: 600; font-style: italic; margin: 10px 0 16px; font-size: 12.5px; }
    .terms-section { font-size: 11.5px; line-height: 1.5; margin-bottom: 20px; }
    .terms-title { font-weight: bold; margin-top: 8px; margin-bottom: 2px; }
    .bank-box { background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 8px 12px; margin: 4px 0 8px; }
    .signatures-table { width: 100%; border-collapse: collapse; margin-top: 30px; page-break-inside: avoid; }
    .signatures-table td { text-align: center; vertical-align: top; width: 33.33%; font-size: 12px; }
    .sig-title { font-weight: bold; }
    .sig-sub { font-size: 10.5px; color: #64748b; font-style: italic; margin-bottom: 60px; }
    .sig-name { font-weight: 600; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="company-title">CÔNG TY TNHH ỨNG DỤNG KỸ THUẬT VÀ GIẢI PHÁP SỐ TDB</div>
  <div class="company-info">
    <strong>[Taxcode]:</strong> 0318137951 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>[Website]:</strong> www.tdbsolution.com.vn<br>
    <strong>[Address]:</strong> Số 26, Đường số 14, Khu dân cư Vạn Phúc, Phường Hiệp Bình, TP Hồ Chí Minh, Việt Nam
  </div>
  <div class="divider"></div>

  <div class="quote-title">BÁO GIÁ (QUOTATION)</div>
  <div class="quote-meta">
    Số: <strong>${escapeHtml(quote.quoteNumber)}</strong> &nbsp;&nbsp;|&nbsp;&nbsp; Ngày: <strong>${dateStr}</strong>
  </div>

  <div class="customer-box">
    <table>
      <tr>
        <td style="width: 140px;"><strong>Kính gửi (To):</strong></td>
        <td>${escapeHtml(customerName)}</td>
      </tr>
      <tr>
        <td><strong>Công ty (Company):</strong></td>
        <td><strong>${escapeHtml(customerCompany)}</strong></td>
      </tr>
      <tr>
        <td><strong>Địa chỉ (Address):</strong></td>
        <td>${escapeHtml(customerAddress)}</td>
      </tr>
    </table>
  </div>

  <div class="intro-text">
    Dựa theo yêu cầu của quý khách, chúng tôi xin được gửi bản báo giá như sau:<br>
    (Based on request, we would like to send the following quotation):
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 36px;">STT<br><span class="sub-th">(No.)</span></th>
        <th style="width: 100px;">Mã sản phẩm<br><span class="sub-th">(Products Code)</span></th>
        <th>Mô tả sản phẩm<br><span class="sub-th">(Product Descriptions)</span></th>
        <th style="width: 60px;">Đơn vị<br><span class="sub-th">(Unit)</span></th>
        <th style="width: 110px;">Đơn giá (VND)<br><span class="sub-th">(Unit Price)</span></th>
        <th style="width: 50px;">Số lượng<br><span class="sub-th">(Qty)</span></th>
        <th style="width: 120px;">Thành tiền<br><span class="sub-th">(Amount)</span></th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">Tổng (Total):</td>
        <td style="text-align:right;">${vnd(subtotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="6" style="text-align:right;">Thuế GTGT (VAT Amount) 8%:</td>
        <td style="text-align:right;">${vnd(vat)}</td>
      </tr>
      <tr class="total-row" style="background:#fefce8;">
        <td colspan="6" style="text-align:right;font-size:13px;color:#0f172a;">Tổng cộng (Equivalent amount paid):</td>
        <td style="text-align:right;font-size:13px;color:#b45309;font-weight:bold;">${vnd(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="in-words">
    Bằng chữ: ${escapeHtml(inWords)}.
  </div>

  <div class="terms-section">
    <div class="terms-title">1. Thông tin sản phẩm:</div>
    <div>Cung cấp giải pháp, module và triển khai kỹ thuật theo phạm vi mô tả chi tiết từng hạng mục ở trên.</div>

    <div class="terms-title">2. Điều khoản và phương thức thanh toán:</div>
    <div style="padding-left: 12px;">
      <strong>2.1. Điều khoản thanh toán:</strong><br>
      • Thanh toán lần 1: Thanh toán 50% giá trị đơn hàng trong vòng 07 ngày khi ký hợp đồng.<br>
      • Thanh toán lần 2: Thanh toán 50% giá trị đơn hàng trong vòng 07 ngày sau khi có biên bản nghiệm thu hoàn thành công việc.<br>
      <strong>2.2. Phương thức & thông tin thanh toán:</strong> Chuyển khoản<br>
      <div class="bank-box">
        <strong>[Ngân hàng]:</strong> Ngân Hàng TMCP và PT VN CN Gia Định (BIDV)<br>
        <strong>[Người thụ hưởng]:</strong> Công ty TNHH Ứng dụng kỹ thuật và Giải pháp số TDB<br>
        <strong>[Số tài khoản]:</strong> <strong style="font-size: 13px; letter-spacing: 0.5px;">8601216868</strong>
      </div>
    </div>

    <div class="terms-title">3. Thời gian thực hiện:</div>
    <div style="padding-left: 12px;">
      3.1. Thời gian triển khai công việc: Dựa theo trao đổi và thống nhất trong hợp đồng.
    </div>

    <div class="terms-title">4. Chú ý:</div>
    <div style="padding-left: 12px;">
      4.1. <strong>[Xác nhận báo giá]:</strong> Vui lòng xác nhận báo giá này bằng việc gửi đơn đặt hàng cho chúng tôi qua email. Việc gửi xác nhận bằng đơn đặt hàng có nghĩa là: Khách hàng xác nhận đã đọc, hiểu rõ và đồng ý tuân theo những điều kiện được đính kèm trong báo giá và phụ lục báo giá.<br>
      4.2. <strong>[Hủy báo giá]:</strong> Sau khi ký xác nhận đặt hàng, đối phương tự ý hủy đơn hàng trước thì phải có trách nhiệm bồi thường 100% giá trị đơn hàng như đã thỏa thuận.<br>
      4.3. <strong>[Hiệu lực báo giá]:</strong> Báo giá này có hiệu lực trong vòng 15 ngày, được tính từ ngày phát hành.
    </div>
  </div>

  <table class="signatures-table">
    <tr>
      <td>
        <div class="sig-title">Giám đốc</div>
        <div class="sig-sub">(Director)</div>
        <div class="sig-name">Hoàng Hải Bình</div>
      </td>
      <td>
        <div class="sig-title">Người báo giá</div>
        <div class="sig-sub">(Quotation created by)</div>
        <div class="sig-name">Cao Thanh Nam</div>
        <div style="font-size:11px;color:#475569;margin-top:4px;">Phone: (+84) 365 619 518</div>
        <div style="font-size:11px;color:#475569;">Email: nam.cao@tdbsolution.com.vn</div>
      </td>
      <td>
        <div class="sig-title">Khách hàng</div>
        <div class="sig-sub">(Customer)</div>
        <div class="sig-name">${escapeHtml(customerName)}</div>
      </td>
    </tr>
  </table>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const popup = window.open(url, '_blank');
  if (!popup) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2500);
      }, 400);
    };
  }
}

function escapeHtml(value?: string | null) {
  if (!value) return '';
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}