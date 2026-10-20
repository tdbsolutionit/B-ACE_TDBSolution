'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileDown, Plus, Trash2 } from 'lucide-react';
import { api, useAuth } from '@/lib/auth';
import { vnd } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { printQuote } from '@/lib/quote-printer';

type Line = { id?: string; moduleName: string; unit?: string; quantity: number; unitPrice: number; total?: number };

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
    code?: string | null;
    shortCode?: string | null;
    company?: string | null;
    address?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    phone?: string | null;
    email?: string | null;
    taxCode?: string | null;
  };
  opportunity: { id: string; name: string; code?: string | null };
  items?: Line[];
};

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
const LABEL: Record<string, string> = { draft: 'Nháp', sent: 'Đã gửi', accepted: 'Chấp nhận', rejected: 'Từ chối', expired: 'Hết hạn' };

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
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
        unit: item.unit || 'Gói',
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
          unit: line.unit || 'Gói',
          quantity: Number(line.quantity) || 0,
          unitPrice: Number(line.unitPrice) || 0,
        })),
      }),
    });
    setQuote((current) => current ? { ...current, ...updated, items: updated.items } : current);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          <p className="mt-1 text-sm text-muted-foreground">{quote.title}</p>
        </div>

        <button
          type="button"
          onClick={() => printQuote(quote, lines, margin, session?.user).catch(console.error)}
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

            <div key={line.id || index} className="grid grid-cols-[1fr_80px_80px_140px_36px] gap-2 items-center">
              <input value={line.moduleName} onChange={(event) => updateLine(setLines, index, { moduleName: event.target.value })} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tên hạng mục" />

              <input
                value={line.unit || ''}
                onChange={(event) => updateLine(setLines, index, { unit: event.target.value })}
                className="h-10 rounded-md border border-input px-3 text-sm text-center"
                placeholder="Đơn vị"
              />

              <input type="number" min={0} value={line.quantity} onChange={(event) => updateLine(setLines, index, { quantity: Number(event.target.value) })} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="SL" />

              <div className="h-10">
                <CurrencyInput
                  key={line.id || index}
                  name={`unitPrice-${index}`}
                  defaultValue={line.unitPrice}
                  onChange={(val) => updateLine(setLines, index, { unitPrice: Number(val) })}
                  placeholder="0"
                />
              </div>

              <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => setLines((current) => current.filter((_, item) => item !== index))}>
                <Trash2 size={15} />
              </button>
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