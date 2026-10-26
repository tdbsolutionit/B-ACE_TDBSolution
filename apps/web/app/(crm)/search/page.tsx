'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/auth';

type Hit = { id: string; name: string; phone?: string | null; customer?: string; href: string };
type Result = { customers: Hit[]; opportunities: Hit[]; quotes: Hit[] };

function SearchScreen() {
  const params = useSearchParams();
  const q = params.get('q') || '';
  const [result, setResult] = useState<Result>({ customers: [], opportunities: [], quotes: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!q) return;
    api<Result>(`/search?q=${encodeURIComponent(q)}`).then(setResult).catch((err: Error) => setError(err.message));
  }, [q]);

  const groups = [
    ['Khách hàng', result.customers],
    ['Dự án', result.opportunities],
    ['Chứng từ', result.quotes],
  ] as const;

  return (
    <>
      <h1 className="font-display text-[28px] font-bold">Tìm kiếm</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Kết quả cho “{q}”</p>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 space-y-6">
        {groups.map(([label, rows]) => (
          <section key={label} className="data-panel">
            <h2 className="mb-3 text-sm font-semibold">{label}</h2>
            {rows.length === 0 ? <p className="text-sm text-muted-foreground">Không có kết quả.</p> : (
              <ul className="space-y-2">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link href={row.href} className="text-sm font-medium text-primary hover:underline">{row.name}</Link>
                    <p className="text-xs text-muted-foreground">{row.customer || row.phone || ''}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </>
  );
}

export default function SearchPage() {
  return <Suspense><SearchScreen /></Suspense>;
}
