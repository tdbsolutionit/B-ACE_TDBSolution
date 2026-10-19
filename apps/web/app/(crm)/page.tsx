'use client';

import Link from 'next/link';
import { TodayWidget } from '@/components/dashboard/today-widget';
import { useRealtime } from '@/lib/realtime';
import { HotDealsWidget } from '@/components/dashboard/hot-deals-widget';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Target, TrendingUp, UsersRound, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '@/lib/auth';
import { initials } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

const COLORS = ['#C9A961', '#7c3aed', '#16a34a', '#d97706', '#e11d48', '#64748b'];

type Dash = {
  leads: number;
  conversion: number;
  pipeline: number;
  openOpportunities: number;
  customers: number;
  sources: Array<{ name: string; value: number }>;
  stages: Array<{ label: string; count: number }>;
  months: Array<{ name: string; actual: number; expected: number }>;
  tasks: Array<{ id: string; title: string; done: boolean; priority: string; time: string; customer: string }>;
  activities: Array<{ id: string; customer: string; company: string; type: string; text: string; owner: string; time: string; status: string }>;
};

export default function DashboardPage() {
  const { session } = useAuth();
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState('');
  const parts = (session?.user.name || '').trim().split(/\s+/);
  const { on } = useRealtime();
  const first = parts.slice(-2).join(' ');
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  useEffect(() => {
    api<Dash>('/dashboard').then(setData).catch((err: Error) => setError(err.message));
  }, []);

  // Realtime: refresh dashboard khi có bất kỳ event nào
  useEffect(() => {
    const refresh = () => {
      api<Dash>('/dashboard').then(setData).catch(() => { });
    };
    const unsubs = [
      on('task:created', refresh),
      on('task:updated', refresh),
      on('deal:created', refresh),
      on('deal:stage-changed', refresh),
      on('customer:created', refresh),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [on]);

  async function toggle(task: Dash['tasks'][number]) {
    await api(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status: task.done ? 'pending' : 'done' }) });
    const next = await api<Dash>('/dashboard');
    setData(next);
  }

  const tasks = data?.tasks || [];
  const done = tasks.filter((task) => task.done).length;
  const kpis = data ? [
    { label: 'Khách hàng', value: String(data.customers), note: `${data.leads} đang là lead`, icon: UsersRound, tone: 'blue' },
    { label: 'Tỷ lệ đang hoạt động', value: `${data.conversion}%`, note: 'trên toàn bộ khách', icon: TrendingUp, tone: 'green' },
    { label: 'Pipeline đang mở', value: data.pipeline >= 1_000_000_000 ? (data.pipeline / 1_000_000_000).toFixed(2) : String(Math.round(data.pipeline / 1_000_000)), unit: data.pipeline >= 1_000_000_000 ? 'tỷ ₫' : 'tr ₫', note: 'cơ hội chưa chốt', icon: Wallet, tone: 'violet' },
    { label: 'Cơ hội đang mở', value: String(data.openOpportunities), note: 'trong quy trình', icon: Target, tone: 'amber' },
  ] : [];

  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Tổng quan</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{hello}, {first} 👋 Đây là tình hình kinh doanh của bạn hôm nay.</p>
        </div>
        <Link href="/bao-cao" className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">
          <CalendarDays size={16} /> Xem báo cáo
        </Link>
      </div>
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span className="mt-0.5">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* ⬇️ THÊM MỚI — 2 widget actionable */}
      <div className="mb-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <TodayWidget tasks={tasks} onToggle={(t) => toggle(t).catch((err: Error) => setError(err.message))} />
        <HotDealsWidget />
      </div>

      <div className="mb-7 grid grid-cols-2 gap-5 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <article key={kpi.label} className={`kpi-card kpi-${kpi.tone}`}>
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-medium text-muted-foreground">{kpi.label}</p>
                <span className="kpi-icon"><Icon size={18} /></span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[32px] font-bold leading-none">{kpi.value}</span>
                {kpi.unit && <span className="text-lg font-semibold">{kpi.unit}</span>}
              </div>
              <p className="mt-5 text-[11px] text-muted-foreground">{kpi.note}</p>
            </article>
          );
        })}
      </div>
      <div className="mb-7 grid gap-6 lg:grid-cols-2">
        <section className="data-panel">
          <h2 className="font-display text-[15px] font-semibold">Lead theo nguồn</h2>
          <p className="mt-1 text-xs text-muted-foreground">Đếm từ khách hàng đã lưu</p>
          <div className="mt-4 h-[222px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.sources || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#C9A961" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="data-panel">
          <h2 className="font-display text-[15px] font-semibold">Giá trị theo tháng</h2>
          <p className="mt-1 text-xs text-muted-foreground">Triệu đồng: báo giá đã nhận và cơ hội tạo mới</p>
          <div className="mt-4 h-[222px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.months || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="actual" name="Đã nhận" fill="#C9A961" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expected" name="Cơ hội mới" fill="#d6d3d1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
      <div className="mb-7 grid gap-6 xl:grid-cols-[1fr_1.85fr]">
        <section className="data-panel">
          <h2 className="font-display text-[15px] font-semibold">Cơ hội theo giai đoạn</h2>
          <p className="mt-1 text-xs text-muted-foreground">{data?.openOpportunities || 0} cơ hội đang mở</p>
          <div className="relative h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.stages || []} dataKey="count" nameKey="label" innerRadius={52} outerRadius={74} stroke="none">
                  {(data?.stages || []).map((item, index) => <Cell key={item.label} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-2xl">{(data?.stages || []).reduce((sum, item) => sum + item.count, 0)}</strong>
              <span className="text-[11px] text-muted-foreground">Cơ hội</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-[11px]">
            {(data?.stages || []).map((item, index) => (
              <span key={item.label} className="flex items-center justify-between gap-2">
                <span className="legend-key"><i className={`stage-dot-${index}`} />{item.label}</span>
                <strong>{item.count}</strong>
              </span>
            ))}
          </div>
        </section>
        <section className="data-panel">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="font-display text-[15px] font-semibold">Công việc</h2>
              <p className="mt-1 text-xs text-muted-foreground">{done}/{tasks.length} công việc đã hoàn thành</p>
            </div>
            <Link href="/cong-viec" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Xem tất cả <ArrowRight size={12} /></Link>
          </div>
          {tasks.map((task) => (
            <div key={task.id} className="task-row">
              <input type="checkbox" className="task-check" checked={task.done} onChange={() => toggle(task).catch((err: Error) => setError(err.message))} />
              <div className="min-w-0 flex-1">
                <p className={task.done ? 'truncate text-[13px] font-medium text-muted-foreground line-through' : 'truncate text-[13px] font-medium'}>{task.title}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{task.customer}</p>
              </div>
              <span className={`priority-badge ${task.priority === 'Cao' ? 'priority-high' : task.priority === 'Thấp' ? 'priority-low' : 'priority-medium'}`}>{task.priority}</span>
              <span className="w-10 text-right text-[11px] text-muted-foreground">{task.time}</span>
            </div>
          ))}
        </section>
      </div>
      <section className="data-panel">
        <h2 className="font-display text-[15px] font-semibold">Hoạt động gần đây</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="crm-table">
            <thead><tr><th>KHÁCH HÀNG</th><th>HOẠT ĐỘNG</th><th>NHÂN VIÊN</th><th>THỜI GIAN</th></tr></thead>
            <tbody>
              {(data?.activities || []).map((item, index) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className={`avatar-initials avatar-tone-${index % 4} inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold`}>{initials(item.customer)}</span>
                      <span className="font-medium">{item.customer}</span>
                    </div>
                  </td>
                  <td><div>{item.type}</div><span className="mt-1.5 block text-[11px] text-muted-foreground">{item.text}</span></td>
                  <td className="text-xs">{item.owner}</td>
                  <td className="text-xs text-muted-foreground">{item.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <footer className="mt-7 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
        <span>© 2026 B-ACE. Đồng hành cùng doanh nghiệp Việt.</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-success" /> <Check size={12} /> Dữ liệu từ cơ sở dữ liệu</span>
      </footer>
    </>
  );
}
