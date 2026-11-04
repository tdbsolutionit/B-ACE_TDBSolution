import { api } from '@/lib/auth';
import type { StageRow } from '@/lib/crm';
import type {
  CreateProjectPayload,
  CustomerDetail,
  UpdateCustomerPayload,
} from '../_types';

export const customerDetailService = {
  get: (id: string) => api<CustomerDetail>(`/customers/${id}`),

  update: (id: string, payload: UpdateCustomerPayload) =>
    api<CustomerDetail>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  convert: (id: string) =>
    api(`/customers/${id}/convert`, { method: 'POST' }),

  updateNotes: (id: string, notes: string) =>
    api(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),

  getStages: () => api<StageRow[]>('/opportunities/stages'),

  createProject: (payload: CreateProjectPayload) =>
    api('/opportunities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};