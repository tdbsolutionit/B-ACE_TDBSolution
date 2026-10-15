export type CustomerRow = {
  id: string;
  code?: string | null;
  shortCode?: string | null;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  type: 'individual' | 'business';
  status: 'lead' | 'active' | 'inactive';
  sourceName: string | null;
  assigneeName: string | null;
  oppCount: number;
  openOppCount: number;
  createdAt: string;
  notes?: string | null;
  taxCode?: string | null;
  industry?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
};

export type ProjectRow = {
  id: string;
  code?: string | null;
  name: string;
  customerId: string;
  customer: string;
  stage: string;
  stageId?: string;
  stageColor: string;
  value: number;
  probability: number;
  closeDate: string;
  status: 'open' | 'won' | 'lost';
  isLead: boolean;
  owner: string;
  description?: string | null;
  lostReason?: string | null;
};

export type DocCard = {
  id: string;
  kind: 'proposal' | 'quote' | 'po';
  number: string;
  title: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  price: number;
  date: string;
};

export type StageRow = { id: string; name: string; color: string; isWon: boolean; isLost: boolean };

export type TaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  priority: 'low' | 'medium' | 'high';
  priorityLabel: string;
  status: 'pending' | 'done';
  done: boolean;
  assigneeName: string | null;
  customer: string;
  overdue?: boolean;
  dueToday?: boolean;
  dueTomorrow?: boolean;
};

export type ProjectFileRow = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: string;
};
