'use client';

import { useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

type Props = {
  open: boolean;
  onClose: () => void;
  customer: { id: string; name: string; phone?: string } | null;
  onSaved?: () => void;
};

const OUTCOMES = [
  { key: 'called', label: 'Đã gọi', tone: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'no_answer', label: 'Không nghe', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'callback', label: 'Hẹn gọi lại', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'not_interested', label: 'Không quan tâm', tone: 'bg-gray-50 text-gray-700 border-gray-200' },
];

export function QuickLogCall({ open, onClose, customer, onSaved }: Props) {
  const [outcome, setOutcome] = useState('called');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome('called');
      setNote('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function save() {
    if (!customer) return;
    setSaving(true);
    try {
      const outcomeLabel = OUTCOMES.find((o) => o.key === outcome)?.label || 'Cuộc gọi';
      await api('/activities', {
        method: 'POST',
        body: JSON.stringify({
          type: 'call',
          subject: outcomeLabel,
          content: note.trim() || outcomeLabel,
          relatedType: 'customer',
          relatedId: customer.id,
        }),
      });
      toast.success(`Đã ghi nhận cuộc gọi với ${customer.name}`);
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  }

  if (!open || !customer) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Phone size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Ghi nhận cuộc gọi</h2>
              <p className="text-[11px] text-muted-foreground">{customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
            <X size={15} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kết quả
            </label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOutcome(o.key)}
                  className={`rounded-md border px-3 py-2 text-xs font-medium transition-all ${
                    outcome === o.key
                      ? `${o.tone} ring-2 ring-primary/40`
                      : 'border-input bg-background hover:border-primary/40'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ghi chú
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Khách nói gì, cần follow-up gì..."
              className="h-24 w-full resize-none rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <p className="text-[10px] text-muted-foreground">
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">⌘</kbd>
            <span className="mx-0.5">+</span>
            <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">↵</kbd>
            {' '}để lưu
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-8 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
