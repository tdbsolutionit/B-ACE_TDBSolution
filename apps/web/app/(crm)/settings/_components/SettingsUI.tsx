'use client';

import { useId } from 'react';
import { Status } from './settings-utils';

export const inputCls = 'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-1 aria-[invalid=true]:border-red-500';

export function Card({ title, description, danger, children }: { title: string; description: string; danger?: boolean; children: React.ReactNode; }) {
    return (
        <section className={`rounded-xl border bg-white p-6 ${danger ? 'border-red-200' : 'border-slate-200'}`}>
            <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
            <p className="mb-5 mt-1 text-[13px] text-slate-500">{description}</p>
            {children}
        </section>
    );
}

export function Field({ label, error, children }: { label: string; error?: string; children: (id: string) => React.ReactNode; }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-900">{label}</label>
            {children(id)}
            {error && <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-700">{error}</p>}
        </div>
    );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string; }) {
    return (
        <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-2 ${checked ? 'bg-[#0B6E78]' : 'bg-slate-300'}`}>
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
        </button>
    );
}

export function ComingSoon({ label }: { label: string }) {
    return (
        <Card title={label} description="Mục này chưa có nội dung.">
            <p className="text-sm text-slate-600">Thêm form cho mục này tại đây.</p>
        </Card>
    );
}

export function StatusBanner({ status, onClose }: { status: NonNullable<Status>; onClose: () => void; }) {
    const isError = status.type === 'error';
    return (
        <div role={isError ? 'alert' : 'status'} className={`mb-6 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${isError ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            <div>
                <p className="font-semibold">{status.title}</p>
                {status.type === 'error' && status.details.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">{status.details.map((d) => <li key={d}>{d}</li>)}</ul>
                )}
            </div>
            <button type="button" onClick={onClose} className="shrink-0 font-semibold underline underline-offset-2">Đóng</button>
        </div>
    );
}