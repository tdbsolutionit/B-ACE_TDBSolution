'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { StatusBadge } from '@/components/shared/badges';
import { BulkActionBar } from '@/components/shared/bulk-action-bar';
import { useBulkSelection } from '@/hooks/use-bulk-selection';
import { compactMoney } from '@/lib/utils';
import Link from 'next/link';
import { FileText, Search } from 'lucide-react';

type QuoteRow = {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  sellingPrice: number;
  customer?: { name: string };
  opportunity?: { name: string };
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  function load() {
    setLoading(true);
    api<QuoteRow[]>('/quotes')
      .then((res) => setQuotes(Array.isArray(res) ? res : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBulkDelete() {
    try {
      const selectedIds = Array.from(bulk.selected);
      await api('/quotes/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: selectedIds }),
      });
      setQuotes((prev) => prev.filter((quote) => !bulk.selected.has(quote.id)));
      toast.success(`Đã xóa ${selectedIds.length} báo giá`);
      bulk.clear();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa báo giá');
    }
  }

  const filteredQuotes = quotes.filter(quote => 
    quote.quoteNumber.toLowerCase().includes(q.toLowerCase()) ||
    quote.title.toLowerCase().includes(q.toLowerCase()) ||
    (quote.customer?.name && quote.customer.name.toLowerCase().includes(q.toLowerCase()))
  );

  const bulk = useBulkSelection(filteredQuotes);

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold flex items-center gap-2">
            <FileText className="text-primary" size={28} /> Báo giá
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Đề xuất, báo giá và đơn hàng đã lưu theo từng dự án.</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-[250px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Tìm mã, tiêu đề, khách hàng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <section className="data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-sm mb-16">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Đang tải danh sách báo giá...</div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
            Chưa có báo giá nào.
          </div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 w-12 text-center">
                  <input
                    type="checkbox"
                    className="cursor-pointer"
                    checked={bulk.isAllSelected}
                    onChange={bulk.isAllSelected ? bulk.clear : bulk.selectAll}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Số</th>
                <th className="px-4 py-3 font-semibold">Tiêu đề</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Dự án</th>
                <th className="px-4 py-3 font-semibold text-right">Giá bán</th>
                <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredQuotes.map((quote, index) => (
                <tr key={quote.id} className={`group cursor-pointer hover:bg-muted/30 transition-colors ${bulk.selected.has(quote.id) ? 'bg-muted/50' : ''}`}>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={bulk.selected.has(quote.id)}
                      onClick={(e) => bulk.toggle(quote.id, index, e.shiftKey)}
                      readOnly
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/quotes/${quote.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{quote.title}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{quote.customer?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{quote.opportunity?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{compactMoney(quote.sellingPrice)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={quote.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <BulkActionBar
        count={bulk.count}
        users={[]} 
        entityName="báo giá"
        onClear={bulk.clear}
        onDelete={handleBulkDelete}
      />
    </>
  );
}