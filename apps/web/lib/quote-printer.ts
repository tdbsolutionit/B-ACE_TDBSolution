import { api } from '@/lib/auth';
import { convertNumberToVietnameseWords, vnd } from '@/lib/utils';

type LineData = { moduleName: string; quantity: number; unitPrice: number; unit?: string; };
type QuoteData = {
  quoteNumber: string;
  customer?: {
    name?: string | null;
    code?: string | null;      
    shortCode?: string | null;
    company?: string | null;
    address?: string | null;
    contactName?: string | null;
  } | null;
  opportunity?: {
    name?: string | null;
    code?: string | null; 
  } | null;
};

type UserData = { name?: string | null; email?: string | null; phone?: string | null; };

export async function printQuote(
  quote: QuoteData, 
  lines: LineData[], 
  margin: number,
  currentUser?: UserData | null
) {
  let tenant: any = {};
  try {
    tenant = await api('/tenants/me');
  } catch (error) {
    console.warn('Không lấy được thông tin công ty, dùng giá trị mặc định');
  }

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  const marginDecimal = (Number(margin) || 0) / 100;
  let subtotal = 0;

  const creatorName = currentUser?.name || 'Người lập báo giá';
  const creatorPhone = currentUser?.phone || '';
  const creatorEmail = currentUser?.email || '';

  const directorName = tenant.directorName || 'Giám đốc';
  
  const defaultTerms = `Thanh toán lần 1: 50% giá trị đơn hàng trong vòng 07 ngày khi ký hợp đồng.\nThanh toán lần 2: 50% giá trị đơn hàng trong vòng 07 ngày sau khi có biên bản nghiệm thu.`;
  const termsText = tenant.quoteTerms || defaultTerms;
  const termsHtml = termsText.replace(/\n/g, '<br>');

  const defaultNotes = `Báo giá này có hiệu lực trong vòng 15 ngày, được tính từ ngày phát hành.`;
  const notesText = tenant.quoteNotes || defaultNotes;
  const notesHtml = notesText.replace(/\n/g, '<br>');

  let customerCodeStr = quote.customer?.shortCode || '';
  if (!customerCodeStr && quote.customer?.code) {
    const match = quote.customer.code.match(/\d+/);
    if (match) customerCodeStr = match[0].slice(-2).padStart(2, '0');
  }
  if (!customerCodeStr) customerCodeStr = '00'; // Fallback

  let projectCodeStr = '0000';
  const searchString = quote.opportunity?.code || quote.opportunity?.name || '';
  if (searchString) {
    const match = searchString.match(/\d{8}-(\d{4})/);
    if (match && match[1]) {
      projectCodeStr = match[1];
    }
  }

  const defaultUnit = tenant.quoteUnit || 'Gói';

  const rows = lines.map((line, idx) => {
    const rawCost = Number(line.unitPrice) || 0;
    const sellUnit = Math.round(rawCost / (1 - marginDecimal));
    const qty = Number(line.quantity) || 1;
    const lineTotal = sellUnit * qty;
    subtotal += lineTotal;
    const itemSeq = String(idx + 1).padStart(3, '0');
    const code = `T${projectCodeStr}${itemSeq}`; 
    return `
      <tr>
        <td style="text-align:center;">${String(idx + 1).padStart(2, '0')}</td>
        <td style="text-align:center;font-weight:600;">${code}</td>
        <td>${escapeHtml(line.moduleName || 'Hạng mục')}</td>
        <td style="text-align:center;">${escapeHtml(line.unit || defaultUnit)}</td>
        <td style="text-align:right;">${vnd(sellUnit)}</td>
        <td style="text-align:center;">${String(qty).padStart(2, '0')}</td>
        <td style="text-align:right;font-weight:600;">${vnd(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const vat = Math.round(subtotal * 0.08);
  const grandTotal = subtotal + vat;
  const inWords = convertNumberToVietnameseWords(grandTotal);

  const customerName = quote.customer?.contactName || quote.customer?.name || '';
  const customerCompany = quote.customer?.company || quote.customer?.name || '';
  const customerAddress = quote.customer?.address || '—';

  const companyName = tenant.name || 'TÊN CÔNG TY CỦA BẠN';
  const companyTax = tenant.taxCode || '';
  const companyWebsite = tenant.website || '';
  const companyAddress = tenant.address || '';
  const bankName = tenant.bankName || '';
  const bankOwner = tenant.bankOwner || companyName;
  const bankAccount = tenant.bankAccount || '';

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

  ${tenant.logoUrl ? `<img src="${tenant.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 200px; object-fit: contain; margin-bottom: 8px;" />` : ''}
  <div class="company-title">${escapeHtml(companyName)}</div>
  <div class="company-info">
    ${companyTax ? `<strong>[Taxcode]:</strong> ${escapeHtml(companyTax)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;` : ''} 
    ${companyWebsite ? `<strong>[Website]:</strong> ${escapeHtml(companyWebsite)}<br>` : ''}
    ${companyAddress ? `<strong>[Address]:</strong> ${escapeHtml(companyAddress)}` : ''}
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
      ${termsHtml}
      <strong>Phương thức & thông tin thanh toán:</strong> Chuyển khoản<br>
      
      ${bankName || bankAccount ? `
      <div class="bank-box">
        ${bankName ? `<strong>[Ngân hàng]:</strong> ${escapeHtml(bankName)}<br>` : ''}
        ${bankOwner ? `<strong>[Người thụ hưởng]:</strong> ${escapeHtml(bankOwner)}<br>` : ''}
        ${bankAccount ? `<strong>[Số tài khoản]:</strong> <strong style="font-size: 13px; letter-spacing: 0.5px;">${escapeHtml(bankAccount)}</strong>` : ''}
      </div>
      ` : ''}
    </div>

    <div class="terms-title">3. Ghi chú:</div>
    <div style="padding-left: 12px;">
      ${notesHtml}
    </div>
  </div>

  <table class="signatures-table">
    <tr>
      <td>
        <div class="sig-title">Giám đốc</div>
        <div class="sig-sub">(Director)</div>
        <div class="sig-name">${escapeHtml(directorName)}</div>
      </td>
      <td>
        <div class="sig-title">Người báo giá</div>
        <div class="sig-sub">(Quotation created by)</div>
        <div class="sig-name">${escapeHtml(creatorName)}</div>
        ${creatorPhone ? `<div style="font-size:11px;color:#475569;margin-top:4px;">Phone: ${escapeHtml(creatorPhone)}</div>` : ''}
        ${creatorEmail ? `<div style="font-size:11px;color:#475569;">Email: ${escapeHtml(creatorEmail)}</div>` : ''}
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