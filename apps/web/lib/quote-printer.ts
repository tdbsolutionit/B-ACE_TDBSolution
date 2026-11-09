import { api } from '@/lib/auth';
import { convertNumberToVietnameseWords, vnd } from '@/lib/utils';

type LineData = { moduleName: string; quantity: number; unitPrice: number; unit?: string; vat?: number };
type QuoteData = {
  quoteNumber: string;
  productInfo?: string | null;
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
type PaymentTerm = { name: string; percentage: number; condition: string };

export async function printQuote(
  quote: QuoteData, 
  lines: LineData[], 
  currentUser?: UserData | null,
  paymentTerms?: PaymentTerm[]
) {
  let tenant: any = {};
  try {
    tenant = await api('/tenants/me');
  } catch (error) {
    console.warn('Không lấy được thông tin công ty');
  }

  let printCss = '';
  try {
    const res = await fetch('/quote-print-styles.css');
    if (res.ok) {
      printCss = await res.text();
    }
  } catch (error) {
    console.warn('Không thể tải file CSS in ấn');
  }

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  let subtotal = 0;
  let totalVat = 0;

  const creatorName = currentUser?.name || 'Người lập báo giá';
  const creatorPhone = currentUser?.phone || '';
  const creatorEmail = currentUser?.email || '';

  const defaultTerms: PaymentTerm[] = [
    { name: 'Đợt 1', percentage: 50, condition: 'Thanh toán trong vòng 07 ngày khi ký hợp đồng.' },
    { name: 'Đợt 2', percentage: 50, condition: 'Thanh toán trong vòng 07 ngày sau khi có biên bản nghiệm thu.' }
  ];
  
  const activeTerms = (paymentTerms && paymentTerms.length > 0) ? paymentTerms : defaultTerms;
  
  const termsHtml = activeTerms.map((term) => 
    `<div style="margin-bottom: 4px;">- <strong>${term.name}:</strong> ${term.percentage}% giá trị đơn hàng. ${term.condition}</div>`
  ).join('');

  const defaultNotes = `Báo giá này có hiệu lực trong vòng 15 ngày, được tính từ ngày phát hành.`;
  const notesText = tenant.quoteNotes || defaultNotes;
  const notesHtml = notesText.replace(/\n/g, '<br>');

  let customerCodeStr = quote.customer?.shortCode || '';
  if (!customerCodeStr && quote.customer?.code) {
    const match = quote.customer.code.match(/\d+/);
    if (match) customerCodeStr = match[0].slice(-2).padStart(2, '0');
  }
  if (!customerCodeStr) customerCodeStr = '00';

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
    const sellUnit = Number(line.unitPrice) || 0;
    const qty = Number(line.quantity) || 1;
    const itemVatRate = Number(line.vat) || 0;
    
    const lineSubtotal = sellUnit * qty;
    const lineVatAmount = Math.round(lineSubtotal * (itemVatRate / 100));
    const lineTotal = lineSubtotal + lineVatAmount;

    subtotal += lineSubtotal;
    totalVat += lineVatAmount;

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
        <td style="text-align:center;">${itemVatRate}%</td>
        <td style="text-align:right;font-weight:600;">${vnd(lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const grandTotal = subtotal + totalVat;
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
    ${printCss}
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
        <th style="width: 100px;">Đơn giá (VND)<br><span class="sub-th">(Unit Price)</span></th>
        <th style="width: 50px;">SL<br><span class="sub-th">(Qty)</span></th>
        <th style="width: 50px;">VAT<br><span class="sub-th">(%)</span></th>
        <th style="width: 110px;">Thành tiền<br><span class="sub-th">(Amount)</span></th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="7" style="text-align:right;">Tổng tiền hàng (Subtotal):</td>
        <td style="text-align:right;">${vnd(subtotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" style="text-align:right;">Tổng thuế GTGT (Total VAT):</td>
        <td style="text-align:right;">${vnd(totalVat)}</td>
      </tr>
      <tr class="total-row" style="background:#fefce8;">
        <td colspan="7" style="text-align:right;font-size:13px;color:#0f172a;">Tổng cộng (Equivalent amount paid):</td>
        <td style="text-align:right;font-size:13px;color:#b45309;font-weight:bold;">${vnd(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="in-words">
    Bằng chữ: ${escapeHtml(inWords)}.
  </div>

  <div class="terms-section">
    ${quote.productInfo ? `
      <div class="terms-title">1. Thông tin sản phẩm:</div>
      <div style="padding-left: 12px;">
        ${quote.productInfo}
      </div>
    ` : ''}
    
    <div class="terms-title">2. Điều khoản và phương thức thanh toán:</div>
    <div style="padding-left: 12px;">
      ${termsHtml}
      
      <div class="payment-method">
        <strong>Phương thức & thông tin thanh toán:</strong> Chuyển khoản
      </div>
      
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
      </td>
    </tr>
  </table>

  <div class="print-footer">
    Trang 1
  </div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

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
      
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url);
      }, 1000);
    }, 500);
  };
}

function escapeHtml(value?: string | null) {
  if (!value) return '';
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}