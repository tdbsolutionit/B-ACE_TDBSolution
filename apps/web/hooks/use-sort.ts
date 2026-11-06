import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export type SortOrder = 'asc' | 'desc';

export function useSort(defaultField: string = 'createdAt', defaultOrder: SortOrder = 'desc') {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sortBy = searchParams.get('sortBy') || defaultField;
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) || defaultOrder;

  const handleSort = useCallback((field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (sortBy === field) {
      params.set('sortOrder', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sortBy', field);
      params.set('sortOrder', 'asc');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams, sortBy, sortOrder]);

  return { sortBy, sortOrder, handleSort };
}