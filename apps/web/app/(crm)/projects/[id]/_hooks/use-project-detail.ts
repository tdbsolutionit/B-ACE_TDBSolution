'use client';
import { useCallback, useEffect, useState } from 'react';
import type { StageRow } from '@/lib/crm';
import { projectDetailService } from '../_services/project-detail.service';
import type { ProjectDetail } from '../_types';

export function useProjectDetail(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Thêm state loading

  const reload = useCallback(async () => {
    // 1. Reset trạng thái mỗi khi bắt đầu load
    setNotFound(false);
    setIsLoading(true);

    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const row = await projectDetailService.get(projectId);
      if (!row) {
        setNotFound(true);
        return;
      }
      setProject(row);
    } catch (err: any) {
      console.error(err);
      if (err?.status === 404 || err?.message?.includes('404') || err?.message?.includes('tìm thấy')) {
        setNotFound(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
    projectDetailService.getStages().then(setStages).catch(() => setStages([]));
  }, [reload]);

  return { project, stages, notFound, isLoading, reload };
}