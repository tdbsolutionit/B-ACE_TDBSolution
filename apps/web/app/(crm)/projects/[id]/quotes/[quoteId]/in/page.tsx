'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/auth';
import { compactMoney } from '@/lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Printer } from 'lucide-react';

export default function PrintQuotePage() {
  const params = useParams();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api(`/quotes/${params.quoteId}`)
      .then(setQuote)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.quoteId]);

  if (loading) return <div className="p-10 text-center">Đang tải dữ liệu...</div>;
  if (!quote) return <div className="p-10 text-center text-red-500">Không tìm thấy báo giá!</div>;

  const isProposal = quote.kind === 'proposal';
  const title = isProposal ? 'ĐỀ XUẤT GIẢI PHÁP' : 'BÁO GIÁ DỊCH VỤ';

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* Thanh công cụ (Sẽ bị ẩn khi in) */}
      <div className="sticky top-0 z-50 flex items-center justify-between bg-white px-8 py-4 shadow-sm print:hidden">
        <h1 className="text-lg font-bold">Xem trước {isProposal ? 'Đề xuất' : 'Báo giá'}</h1>
        <button 
          onClick={() => window.print()} 
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          <Printer size={18} /> In / Lưu PDF
        </button>
      </div>

      {/* Khổ giấy A4 */}
      <div className="mx-auto mt-8 w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg print:mt-0 print:shadow-none print:w-full print:p-0">
        
        {/* HEADER: Logo & Thông tin công ty */}
        <div className="flex items-start justify-between border-b-2 border-primary pb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">B-ACE SME</h2>
            <p className="mt-1 text-sm text-gray-500">Giải pháp chuyển đổi số cho doanh nghiệp</p>
            <p className="text-sm text-gray-500 mt-2">Địa chỉ: 123 Đường ABC, TP.HCM</p>
            <p className="text-sm text-gray-500">MST: 0101010101 | SĐT: 0909 123 456</p>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase">{title}</h1>
            <p className="text-sm font-medium mt-2">Số: {quote.quoteNumber}</p>
            <p className="text-sm text-gray-500">Ngày lập: {format(new Date(quote.createdAt), 'dd/MM/yyyy')}</p>
            {quote.validUntil && (
              <p className="text-sm text-gray-500">Hiệu lực đến: {format(new Date(quote.validUntil), 'dd/MM/yyyy')}</p>
            )}
          </div>
        </div>

        {/* THÔNG TIN KHÁCH HÀNG */}
        <div className="mt-8 flex justify-between">
          <div className="w-1/2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Khách hàng</h3>
            <p className="font-bold text-lg">{quote.customer.name}</p>
            <p className="text-sm">Người liên hệ: {quote.customer.contactName || '...'}</p>
            <p className="text-sm">SĐT: {quote.customer.phone || '...'}</p>
            <p className="text-sm">Email: {quote.customer.email || '...'}</p>
            <p className="text-sm">Địa chỉ: {quote.customer.address || '...'}</p>
          </div>
          <div className="w-1/2 text-right">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Dự án</h3>
            <p className="font-bold">{quote.opportunity?.name}</p>
          </div>
        </div>

        {/* TIÊU ĐỀ ĐỀ XUẤT */}
        <div className="mt-10 mb-6 text-center">
          <h2 className="text-xl font-bold uppercase">Về việc: {quote.title}</h2>
        </div>

        {/* BẢNG CHI TIẾT HẠNG MỤC */}
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-center w-12">STT</th>
              <th className="border p-2">Hạng mục / Nội dung</th>
              <th className="border p-2 text-center w-20">SL</th>
              <th className="border p-2 text-right w-32">Đơn giá (VNĐ)</th>
              <th className="border p-2 text-right w-32">Thành tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            {quote.items?.map((item: any, index: number) => (
              <tr key={item.id}>
                <td className="border p-2 text-center">{index + 1}</td>
                <td className="border p-2 font-medium">{item.moduleName}</td>
                <td className="border p-2 text-center">{item.quantity}</td>
                <td className="border p-2 text-right">{compactMoney(item.unitPrice)}</td>
                <td className="border p-2 text-right font-medium">{compactMoney(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TỔNG CỘNG */}
        <div className="mt-4 flex justify-end">
          <div className="w-1/2">
            <div className="flex justify-between border-b py-2">
              <span className="font-medium">Tổng cộng:</span>
              <span className="font-medium">{compactMoney(quote.totalCost)}</span>
            </div>
            <div className="flex justify-between border-b py-2">
              <span className="font-medium">Thuế GTGT (VAT 10%):</span>
              <span className="font-medium">{compactMoney(quote.totalCost * 0.1)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg text-primary font-bold">
              <span>TỔNG THANH TOÁN:</span>
              <span>{compactMoney(quote.totalCost * 1.1)}</span>
            </div>
          </div>
        </div>

        {/* ĐIỀU KHOẢN & GHI CHÚ */}
        <div className="mt-10">
          <h3 className="font-bold border-b pb-1 mb-2">Điều khoản & Ghi chú:</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {quote.notes || 'Chưa có ghi chú thêm.'}
            {'\n\n'}
            - Thời gian thực hiện dự kiến: {quote.workingDays} ngày công.
            - Báo giá này có hiệu lực đến ngày {quote.validUntil ? format(new Date(quote.validUntil), 'dd/MM/yyyy') : '...'}.
          </div>
        </div>

        {/* CHỮ KÝ */}
        <div className="mt-16 flex justify-between text-center text-sm">
          <div className="w-1/2">
            <p className="font-bold uppercase">Đại diện Khách hàng</p>
            <p className="text-gray-500 italic mb-20">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="w-1/2">
            <p className="font-bold uppercase">Đại diện B-ACE</p>
            <p className="text-gray-500 italic mb-20">(Ký và ghi rõ họ tên)</p>
          </div>
        </div>

      </div>

      {/* CSS In ấn: Ẩn các thành phần thừa */}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}