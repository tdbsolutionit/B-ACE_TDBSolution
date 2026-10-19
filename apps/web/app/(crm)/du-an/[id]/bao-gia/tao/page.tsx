'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { priceQuote } from '@bace/shared';
import { api } from '@/lib/auth';
import { type ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';

function QuoteBuilder() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  
  const kind = search.get('kind') === 'proposal' ? 'proposal' : search.get('kind') === 'po' ? 'po' : 'quote';
  const label = kind === 'proposal' ? 'Đề xuất' : kind === 'po' ? 'Đơn hàng' : 'Báo giá';

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [error, setError] = useState('');
  
  // State cho Form (Dựa trên model Quote)
  const [title, setTitle] = useState('');
  const [scenario, setScenario] = useState<'low' | 'mid' | 'high'>('mid');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  
  const [days, setDays] = useState(98);
  const [people, setPeople] = useState(2);
  const [rate, setRate] = useState(1_000_000);
  const [otherCost, setOtherCost] = useState(0);
  const [profitMargin, setProfitMargin] = useState(50);

  // Tính toán giá tự động
  const priced = useMemo(() => priceQuote({
    workingDays: days,
    freelancers: people,
    freelanceRate: rate,
    vpsDomain: 1_000_000,
    buffer: 20_000_000,
    commissionRate: 10,
    entertainmentRate: 10,
    otherRate: 8, // Có thể map với otherCost nếu cần
    profitMargin: profitMargin,
  }), [days, people, rate, profitMargin]);

  useEffect(() => {
    api<ProjectRow>(`/opportunities/${params.id}`).then((row) => {
      setProject(row);
      setTitle(`${label} ${row.name}`);
    }).catch((err: Error) => setError(err.message));
  }, [params.id, label]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError('Vui lòng nhập tiêu đề');
    
    try {
      await api('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: params.id,
          title,
          kind,
          scenario,
          workingDays: days,
          freelancers: people,
          freelanceRate: rate,
          otherCost: otherCost,
          profitMargin: profitMargin,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          notes,
          // Các trường tính toán tự động sẽ được Backend tính lại cho an toàn, 
          // nhưng ta vẫn có thể gửi lên nếu muốn.
        }),
      });
      router.push(`/du-an/${params.id}`);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu');
    }
  }

  if (!project) return <p className="text-sm text-muted-foreground p-6">{error || 'Đang tải dự án…'}</p>;

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/du-an/${project.id}`} className="hover:text-foreground">← Quay lại Dự án</Link>
        </div>
        <h1 className="font-display text-2xl font-bold">Tạo {label} mới</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dự án: <strong className="text-foreground">{project.name}</strong> · Khách hàng: <strong className="text-foreground">{project.customer}</strong>
        </p>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>}

      <form className="space-y-6" onSubmit={save}>
        {/* PHẦN 1: THÔNG TIN CHUNG */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold border-b border-border pb-2">1. Thông tin chung</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              Tiêu đề {label} <span className="text-destructive">*</span>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary/40 outline-none" />
            </label>
            <label className="block text-sm">
              Kịch bản / Gói giải pháp
              <select value={scenario} onChange={(e) => setScenario(e.target.value as any)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none">
                <option value="low">Cơ bản (Low)</option>
                <option value="mid">Tiêu chuẩn (Mid)</option>
                <option value="high">Nâng cao (High)</option>
              </select>
            </label>
            <label className="block text-sm">
              Hiệu lực đến ngày
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none" />
            </label>
          </div>
        </section>

        {/* PHẦN 2: CHI PHÍ & NHÂN SỰ */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold border-b border-border pb-2">2. Cấu hình chi phí & Nhân sự</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="block text-sm">
              Tổng ngày công
              <input type="number" min="0" value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm outline-none" />
            </label>
            <label className="block text-sm">
              Số lượng Freelancer
              <input type="number" min="0" value={people} onChange={(e) => setPeople(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm outline-none" />
            </label>
            <label className="block text-sm">
              Đơn giá / ngày (VNĐ)
              <input type="number" min="0" step="100000" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm outline-none" />
            </label>
            <label className="block text-sm">
              Chi phí phát sinh khác
              <input type="number" min="0" value={otherCost} onChange={(e) => setOtherCost(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm outline-none" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 max-w-sm">
             <label className="block text-sm">
              Biên lợi nhuận (%)
              <input type="number" min="0" max="100" value={profitMargin} onChange={(e) => setProfitMargin(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-md border border-input px-3 text-sm outline-none" />
            </label>
          </div>
          
          {/* Bảng tóm tắt chi phí (Readonly) */}
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <h3 className="mb-3 text-sm font-semibold">Tóm tắt tính toán (Tự động)</h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 text-sm">
              <div>
                <span className="block text-xs text-muted-foreground">Nhân sự</span>
                <strong>{compactMoney(priced.personnelCost)}</strong>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Chi phí khác</span>
                <strong>{compactMoney(priced.otherCost)}</strong>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Tổng chi phí</span>
                <strong>{compactMoney(priced.totalCost)}</strong>
              </div>
              <div>
                <span className="block text-xs text-muted-foreground">Giá bán đề xuất</span>
                <strong className="text-primary text-base">{compactMoney(priced.sellingPrice)}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* PHẦN 3: ĐIỀU KHOẢN & GHI CHÚ */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold border-b border-border pb-2">3. Điều khoản & Ghi chú</h2>
          <label className="block text-sm">
            Nội dung ghi chú / Điều khoản đi kèm
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
              placeholder="VD: Chưa bao gồm VAT 10%. Thời gian bảo hành 12 tháng..."
              className="mt-1.5 min-h-[100px] w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40" 
            />
          </label>
        </section>

        {/* Nút Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Link href={`/du-an/${project.id}`} className="inline-flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
            Hủy bỏ
          </Link>
          <button type="submit" className="inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Lưu {label}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CreateQuotePage() {
  return <Suspense><QuoteBuilder /></Suspense>;
}