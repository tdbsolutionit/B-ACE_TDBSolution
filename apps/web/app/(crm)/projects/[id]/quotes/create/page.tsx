'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

export default function CreateQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function initQuote() {
      try {
        const project = await api<any>(`/opportunities/${params.id}`);
        
        const newQuote = await api<any>('/quotes', {
          method: 'POST',
          body: JSON.stringify({
            opportunityId: params.id,
            title: `Báo giá ${project.name}`,
            kind: 'quote',
            scenario: 'mid',
          }),
        });

        if (isMounted) {
          toast.success('Đã tạo báo giá nháp');
          router.replace(`/quotes/${newQuote.id}`);
        }
      } catch (err: any) {
        if (isMounted) {
          toast.error(err.message || 'Lỗi khi khởi tạo báo giá');
          router.replace(`/projects/${params.id}`);
        }
      }
    }

    initQuote();

    return () => { isMounted = false; };
  }, [params.id, router]);

  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Đang khởi tạo báo giá và chuyển hướng...</p>
      </div>
    </div>
  );
}