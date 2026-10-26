'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { vnd } from '@/lib/utils';

const STATUS: Record<string, string> = {
  draft: 'Nháp',
  sent: 'Đã gửi',
  accepted: 'Đã chấp nhận',
  rejected: 'Đã từ chối',
  expired: 'Hết hạn',
};

type QuoteRow = {
  id: string;
  quoteNumber: string;
  title: string;
  kind: string;
  status: string;
  sellingPrice: number;
  customer: { name: string };
  opportunity: { name: string };
};

export default function QuotesPage() {
  const [rows, setRows] = useState<QuoteRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<QuoteRow[]>('/quotes').then(setRows).catch((err: Error) => setError(err.message));
  }, []);

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-[28px] font-bold">Báo giá</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Đề xuất, báo giá và đơn hàng đã lưu theo từng dự án.</p>
      </div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mt-0.5">⚠️</span>
          <p>{error}</p>
        </div>
      )}
      <section className="data-panel overflow-x-auto">
        <table className="crm-table">
          <thead><tr><th>SỐ</th><th>TIÊU ĐỀ</th><th>KHÁCH HÀNG</th><th>DỰ ÁN</th><th>GIÁ BÁN</th><th>TRẠNG THÁI</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><Link href={`/quotes/${row.id}`} className="font-medium text-primary">{row.quoteNumber}</Link></td>
                <td>{row.title}</td>
                <td className="text-xs">{row.customer?.name}</td>
                <td className="text-xs">{row.opportunity?.name}</td>
                <td>{vnd(Number(row.sellingPrice))}</td>
                <td><span className={row.status === 'accepted' ? 'status-badge status-success' : row.status === 'draft' ? 'status-badge status-warning' : 'status-badge status-blue'}>{STATUS[row.status] || row.status}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Chưa có chứng từ.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
