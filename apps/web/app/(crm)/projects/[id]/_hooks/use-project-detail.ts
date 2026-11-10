import { useCallback, useEffect, useState } from 'react';
import type { StageRow } from '@/lib/crm';
import { projectDetailService } from '../_services/project-detail.service';
import type { ProjectDetail } from '../_types';

export function useProjectDetail(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const reload = useCallback(async () => {
    if (!projectId) return;

    setIsLoading(true);
    setNotFound(false);
    setErrorMsg('');

    try {
      const row = await projectDetailService.get(projectId);
      if (!row) {
        setNotFound(true);
      } else {
        setProject(row);
      }
    } catch (err: any) {
      console.error("Lỗi tải dự án:", err);
      if (err?.status === 404) {
        setNotFound(true);
      } else {
        setErrorMsg(err?.message || 'Lỗi kết nối đến máy chủ');
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reload();
    projectDetailService.getStages().then(setStages).catch(() => setStages([]));
  }, [reload]);

  return { project, stages, notFound, isLoading, errorMsg, reload };
}