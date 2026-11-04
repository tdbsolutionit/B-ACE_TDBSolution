import type { DocCard, ProjectRow } from '@/lib/crm';

export type ProjectTabId = 'proposal' | 'quote' | 'po';

export interface ProjectActivity {
  id: string;
  subject: string;
  content: string | null;
  createdAt: string;
  owner: string;
}

export interface ProjectDetail extends ProjectRow {
  lostReason?: string | null;
  quotes: DocCard[];
  activities: ProjectActivity[];
}

export interface UpdateProjectPayload {
  name: string;
  code: string;
  value: number;
  probability: number;
  expectedCloseDate: string;
  stageId: string;
}

export interface MoveStagePayload {
  stageId: string;
  lostReason?: string;
}