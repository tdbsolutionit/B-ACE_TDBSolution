'use client';

import { useState } from 'react';
import { api } from '@/lib/auth';

const TYPES = [
  { id: 'call', label: 'Gọi điện' },
  { id: 'meeting', label: 'Gặp mặt' },
  { id: 'note', label: 'Ghi chú' },
] as const;

export function ActivityForm({
  relatedType,
  relatedId,
  onSaved,
}: {
  relatedType: 'customer' | 'opportunity';
  relatedId: string;
  onSaved: () => void;
}) {
  const [type, setType] = useState<(typeof TYPES)[number]['id']>('call');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  async function save() {
    if (!content.trim()) {
      setError('Nhập nội dung tương tác');
      return;
    }
    const subject = TYPES.find((item) => item.id === type)?.label || 'Ghi chú';
    await api('/activities', {
      method: 'POST',
      body: JSON.stringify({ type, subject, content: content.trim(), relatedType, relatedId }),
    });
    setContent('');
    setError('');
    onSaved();
  }

  return (
    <div className="mb-5 rounded-lg border border-border p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        {TYPES.map((item) => (
          <button key={item.id} type="button" onClick={() => setType(item.id)} className={type === item.id ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground' : 'rounded-full border px-3 py-1 text-xs'}>
            {item.label}
          </button>
        ))}
      </div>
      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Nội dung cuộc gọi, cuộc gặp hoặc ghi chú..." className="h-20 w-full rounded-md border border-input bg-background p-3 text-sm" />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <button type="button" onClick={() => save().catch((err: Error) => setError(err.message))} className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
        Lưu tương tác
      </button>
    </div>
  );
}
