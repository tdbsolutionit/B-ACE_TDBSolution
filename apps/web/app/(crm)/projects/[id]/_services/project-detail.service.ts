import { api } from '@/lib/auth';
import type { StageRow } from '@/lib/crm';
import type { MoveStagePayload, ProjectDetail, UpdateProjectPayload } from '../_types';

export const projectDetailService = {
  get: (id: string) => api<ProjectDetail>(`/opportunities/${id}`),

  getStages: () => api<StageRow[]>('/opportunities/stages'),

  update: (id: string, payload: UpdateProjectPayload) =>
    api(`/opportunities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  moveStage: (id: string, payload: MoveStagePayload) =>
    api(`/opportunities/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};