import type { CustomerRow, ProjectRow } from '@/lib/crm';

export interface CustomerActivity {
  id: string;
  type: string;
  subject: string;
  content: string | null;
  owner: string;
  createdAt: string;
}

export interface CustomerDetail extends CustomerRow {
  opportunities: ProjectRow[];
  activities: CustomerActivity[];
}

export interface UpdateCustomerPayload {
  code: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  industry: string;
  type: string;
  status: string;
  sourceName: string;
}

export interface CreateProjectPayload {
  name: string;
  customerId: string;
  stageId: string;
  value: number;
  probability: number;
  expectedCloseDate?: string;
  description?: string;
}

export type CustomerTabId = 'info' | 'projects' | 'activities' | 'notes';