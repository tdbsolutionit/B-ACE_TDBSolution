'use client';
import { useCallback, useEffect, useState } from 'react';
import { customerDetailService } from '../_services/customer-detail.service';
import type { CustomerDetail } from '../_types';

export function useCustomerDetail(customerId: string | undefined) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    if (!customerId) return;
    try {
      const data = await customerDetailService.get(customerId);
      setCustomer(data);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Không tải được khách hàng');
    }
  }, [customerId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { customer, error, reload, setError };
}