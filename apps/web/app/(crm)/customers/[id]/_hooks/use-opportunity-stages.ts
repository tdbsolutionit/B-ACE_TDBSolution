'use client';
import { useEffect, useState } from 'react';
import type { StageRow } from '@/lib/crm';
import { customerDetailService } from '../_services/customer-detail.service';

export function useOpportunityStages() {
  const [stages, setStages] = useState<StageRow[]>([]);

  useEffect(() => {
    customerDetailService
      .getStages()
      .then(setStages)
      .catch(() => setStages([]));
  }, []);

  return stages;
}