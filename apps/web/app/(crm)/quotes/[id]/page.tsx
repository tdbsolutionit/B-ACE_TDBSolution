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
import { SubmitButton } from '@/components/ui/submit-button';
import { StatusBadge } from '@/components/shared/badges';
import { RichTextEditor } from '@/components/shared/rich-text-editor';

type Line = { id?: string; moduleName: string; unit?: string; quantity: number; unitPrice: number; vat?: number; total?: number };
type PaymentTerm = { name: string; percentage: number; condition: string };

type Quote = {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  createdAt?: string;
  totalAmount: number;
  productInfo?: string;
  customer: {
    name: string; code?: string | null; shortCode?: string | null; company?: string | null; address?: string | null;
    contactName?: string | null; contactPhone?: string | null; contactEmail?: string | null; phone?: string | null; email?: string | null; taxCode?: string | null;
  };
  opportunity: { id: string; name: string; code?: string | null };
  items?: Line[];
  paymentTerms?: PaymentTerm[];
};

const STATUSES = ['draft', 'sent', 'accepted', 'rejected', 'expired'] as const;
const LABEL: Record<string, string> = { draft: 'Nháp', sent: 'Đã gửi', accepted: 'Chấp nhận', rejected: 'Từ chối', expired: 'Hết hạn' };

export default function QuoteDetailPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [productInfo, setProductInfo] = useState('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    { name: 'Đợt 1', percentage: 50, condition: 'Thanh toán trong vòng 07 ngày khi ký hợp đồng.' },
    { name: 'Đợt 2', percentage: 50, condition: 'Thanh toán trong vòng 07 ngày sau khi có biên bản nghiệm thu.' }
  ]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    return api<Quote>(`/quotes/${params.id}`).then((row) => {
      setQuote(row);
      setProductInfo(row.productInfo || '');
      const items = (row.items || []).map((item) => ({
        id: item.id,
        moduleName: item.moduleName,
        unit: item.unit || 'Gói',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        vat: Number(item.vat) || 0,
      }));
      setLines(items.length ? items : [{ moduleName: 'Hạng mục', quantity: 1, unitPrice: Number(row.totalAmount) || 0, vat: 0 }]);
      
      if ((row as any).paymentTerms) {
        setPaymentTerms((row as any).paymentTerms);
      }
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
    setSaving(true);
    try {
      const updated = await api<Quote>(`/quotes/${params.id}/items`, {
        method: 'PATCH',
        body: JSON.stringify({
          items: lines.map((line) => ({
            moduleName: line.moduleName,
            unit: line.unit || 'Gói',
            quantity: Number(line.quantity) || 0,
            unitPrice: Number(line.unitPrice) || 0,
            vat: Number(line.vat) || 0,
          })),
          paymentTerms: paymentTerms,
          productInfo: productInfo,
        }),
      });
      setQuote((current) => current ? { ...current, ...updated, items: updated.items } : current);

      setProductInfo(updated.productInfo || '');
      if (updated.paymentTerms) {
        setPaymentTerms(updated.paymentTerms);
      }
      toast.success('Đã lưu thay đổi');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  }

  const price = lines.reduce((sum, line) => {
    const subTotal = (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
    const vatAmount = subTotal * ((Number(line.vat) || 0) / 100);
    return sum + subTotal + vatAmount;
  }, 0);

  const updateTerm = (index: number, field: keyof PaymentTerm, value: string | number) => {
    setPaymentTerms(current => current.map((term, i) => i === index ? { ...term, [field]: value } : term));
  };

  if (error && !quote) return <p className="text-sm text-destructive">{error}</p>;
  if (!quote) return <p className="text-sm text-muted-foreground">Đang tải báo giá…</p>;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={quote.opportunity ? `/projects/${quote.opportunity.id}` : '/quotes'} className="text-xs text-muted-foreground">← Dự án</Link>
          <h1 className="mt-3 font-display text-[28px] font-bold">{quote.quoteNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{quote.title}</p>
        </div>

        <button
          type="button"
          onClick={() => printQuote(quote, lines, session?.user, paymentTerms).catch(console.error)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-primary/40 bg-secondary px-4 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <FileDown size={16} /> Xuất PDF / In báo giá
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUSES.map((status) => (
          <button key={status} type="button" onClick={() => setStatus(status)} className={quote.status === status ? 'ring-2 ring-primary ring-offset-1 rounded-full' : 'opacity-60 hover:opacity-100 transition-opacity'}>
            <StatusBadge status={status} />
          </button>
        ))}
      </div>

      <section className="data-panel mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Hạng mục</h2>
          <button 
            type="button" 
            onClick={() => setLines((current) => [...current, { moduleName: '', quantity: 1, unitPrice: 0, vat: 0 }])} 
            className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs hover:bg-accent"
          >
            <Plus size={14} /> Thêm dòng
          </button>
        </div>
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div key={line.id || index} className="grid grid-cols-[1fr_70px_60px_130px_70px_36px] gap-2 items-center">
              <input value={line.moduleName} onChange={(event) => updateLine(setLines, index, { moduleName: event.target.value })} className="h-10 rounded-md border border-input px-3 text-sm" placeholder="Tên hạng mục" />
              <input value={line.unit || ''} onChange={(event) => updateLine(setLines, index, { unit: event.target.value })} className="h-10 rounded-md border border-input px-3 text-sm text-center" placeholder="Đơn vị" />
              <input type="number" min={0} value={line.quantity} onChange={(event) => updateLine(setLines, index, { quantity: Number(event.target.value) })} className="h-10 rounded-md border border-input px-3 text-sm text-center" placeholder="SL" />
              
              <div className="h-10">
                <CurrencyInput key={line.id || index} name={`unitPrice-${index}`} defaultValue={line.unitPrice} onChange={(val) => updateLine(setLines, index, { unitPrice: Number(val) })} placeholder="Đơn giá" />
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  min={0} 
                  max={100} 
                  value={line.vat || 0} 
                  onChange={(event) => updateLine(setLines, index, { vat: Number(event.target.value) })} 
                  className="h-10 w-full rounded-md border border-input pl-3 pr-6 text-sm" 
                  placeholder="VAT" 
                />
                <span className="absolute right-2 top-3 text-xs text-muted-foreground">%</span>
              </div>

              <button type="button" className="inline-flex items-center justify-center text-muted-foreground hover:text-destructive h-10" onClick={() => setLines((current) => current.filter((_, item) => item !== index))}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Tổng cộng (Đã bao gồm VAT):</span>
            <p className="text-lg font-semibold text-primary">{vnd(price)}</p>
          </div>
        </div>
      </section>

      <section className="data-panel mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Thông tin sản phẩm (Hiển thị trên báo giá)</h2>
        </div>
        <RichTextEditor 
          value={productInfo} 
          onChange={setProductInfo} 
          placeholder="Nhập mô tả chi tiết về giải pháp, phạm vi công việc..." 
        />
        <div className="mt-4 flex justify-end">
          <SubmitButton isSaving={saving} label="Lưu thông tin" onClick={saveLines} />
        </div>
      </section>

      <section className="data-panel mb-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Điều khoản thanh toán</h2>
          <button 
            type="button" 
            onClick={() => setPaymentTerms([...paymentTerms, { name: `Đợt ${paymentTerms.length + 1}`, percentage: 0, condition: '' }])} 
            className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs hover:bg-accent"
          >
            <Plus size={14} /> Thêm đợt
          </button>
        </div>
        <div className="space-y-3">
          {paymentTerms.map((term, index) => (
            <div key={index} className="flex gap-2 items-start">
              <input 
                value={term.name} 
                onChange={(e) => updateTerm(index, 'name', e.target.value)} 
                className="h-10 w-24 rounded-md border border-input px-3 text-sm font-medium" 
                placeholder="Tên đợt" 
              />
              <div className="relative w-24 shrink-0">
                <input 
                  type="number" 
                  min={0} 
                  max={100} 
                  value={term.percentage} 
                  onChange={(e) => updateTerm(index, 'percentage', Number(e.target.value))} 
                  className="h-10 w-full rounded-md border border-input pl-3 pr-6 text-sm" 
                  placeholder="%" 
                />
                <span className="absolute right-2 top-3 text-xs text-muted-foreground">%</span>
              </div>
              <input 
                value={term.condition} 
                onChange={(e) => updateTerm(index, 'condition', e.target.value)} 
                className="h-10 flex-1 rounded-md border border-input px-3 text-sm" 
                placeholder="Điều kiện thanh toán (VD: Sau khi ký hợp đồng...)" 
              />
              <button 
                type="button" 
                className="inline-flex h-10 items-center justify-center text-muted-foreground hover:text-destructive px-2" 
                onClick={() => setPaymentTerms(current => current.filter((_, i) => i !== index))}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        
        <div className="mt-4 flex items-center justify-end gap-3 border-t border-border pt-4">
          <SubmitButton isSaving={saving} label="Lưu hạng mục & Điều khoản" onClick={saveLines} />
        </div>
      </section>
    </>
  );
}

function updateLine(setLines: React.Dispatch<React.SetStateAction<Line[]>>, index: number, patch: Partial<Line>) {
  setLines((current) => current.map((line, item) => (item === index ? { ...line, ...patch } : line)));
}