'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';

type Stage = {
  id: string;
  name: string;
  color: string;
  orderIndex: number;
  isWon: boolean;
  isLost: boolean;
};

const COLORS = ['#94A3B8', '#60A5FA', '#A78BFA', '#F59E0B', '#FB923C', '#10B981', '#EF4444', '#EC4899', '#06B6D4'];

export function PipelineSection() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api<Stage[]>('/stages');
        setStages(data.sort((a, b) => a.orderIndex - b.orderIndex));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const update = (id: string, patch: Partial<Stage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
    setDirty(true);
  };

  const remove = (id: string) => {
    const s = stages.find((x) => x.id === id);
    if (s?.isWon || s?.isLost) return;
    if (stages.length <= 2) return alert('Pipeline cần tối thiểu 2 giai đoạn.');
    setStages((prev) => prev.filter((x) => x.id !== id));
    setDirty(true);
  };

  const add = () => {
    setStages((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: 'Giai đoạn mới',
        color: COLORS[prev.length % COLORS.length],
        orderIndex: prev.length,
        isWon: false,
        isLost: false,
      },
    ]);
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api('/stages', {
        method: 'PUT',
        body: JSON.stringify({ stages }),
      });
      setDirty(false);
      alert('Đã lưu pipeline');
    } catch (e) {
      alert('Lưu pipeline thất bại');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tải pipeline…</div>;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-[17px] font-semibold text-slate-900">Pipeline & giai đoạn</h2>
          <p className="mt-1 text-[13px] text-slate-500">Sắp xếp thứ tự các giai đoạn bán hàng.</p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="h-10 rounded-lg bg-[#0B6E78] px-4 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-50"
        >
          {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
      </div>

      <ul className="space-y-2">
        {stages.map((stage, i) => (
          <li key={stage.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 hover:border-slate-300">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6"/></svg>
              </button>
              <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
            </div>

            <input
              type="color"
              value={stage.color}
              onChange={(e) => update(stage.id, { color: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border border-slate-200"
            />

            <input
              value={stage.name}
              onChange={(e) => update(stage.id, { name: e.target.value })}
              className="h-9 flex-1 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-[#0B6E78] focus:bg-white focus:outline-none"
            />

            {stage.isWon && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-emerald-700">Thắng</span>}
            {stage.isLost && <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold uppercase text-red-700">Thua</span>}

            {!stage.isWon && !stage.isLost && (
              <button onClick={() => remove(stage.id)} className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <button onClick={add} className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-[#0B6E78] hover:text-[#0B6E78]">
        + Thêm giai đoạn
      </button>
    </section>
  );
}