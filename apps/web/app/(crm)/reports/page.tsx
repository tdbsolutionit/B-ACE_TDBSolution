'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/auth';
import { compactMoney } from '@/lib/utils';

type Report = {
  leads: number;
  conversion: number;
  pipeline: number;
  sources: Array<{ name: string; value: number }>;
  stages: Array<{ label: string; count: number }>;
  months: Array<{ name: string; actual: number; expected: number }>;
};

export default function ReportsPage() {
  const [data, setData] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<Report>('/dashboard').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Đang tải báo cáo…</p>;

  return (
    <>
      <div className="mb-7">
        <h1 className="font-display text-[28px] font-bold">Báo cáo</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Số liệu lấy từ khách hàng, cơ hội và báo giá đã lưu.</p>
      </div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="kpi-card kpi-blue"><p className="text-xs text-muted-foreground">Lead</p><p className="mt-2 text-3xl font-bold">{data.leads}</p></article>
        <article className="kpi-card kpi-green"><p className="text-xs text-muted-foreground">Tỷ lệ đang hoạt động</p><p className="mt-2 text-3xl font-bold">{data.conversion}%</p></article>
        <article className="kpi-card kpi-amber"><p className="text-xs text-muted-foreground">Pipeline mở</p><p className="mt-2 text-3xl font-bold">{compactMoney(data.pipeline)}</p></article>
      </div>
      <section className="data-panel mb-6">
        <h2 className="mb-4 text-[15px] font-semibold">Giá trị 6 tháng (triệu đồng)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.months}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="actual" name="Báo giá đã nhận" fill="#C9A961" />
              <Bar dataKey="expected" name="Cơ hội tạo mới" fill="#e7e5e4" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="data-panel">
        <table className="crm-table">
          <thead><tr><th>NGUỒN / GIAI ĐOẠN</th><th>SỐ LƯỢNG</th></tr></thead>
          <tbody>
            {data.sources.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.value}</td></tr>)}
            {data.stages.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>)}
          </tbody>
        </table>
      </section>
    </>
  );
}
