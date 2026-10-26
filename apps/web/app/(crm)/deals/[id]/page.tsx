'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LegacyOpportunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/projects/${params.id}`);
  }, [params.id, router]);
  return null;
}
