'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from '@/components/ui/toast';
import type { StageRow } from '@/lib/crm';

import { ProjectHeader } from '../_components/project-header';
import { ProjectDocs } from '../_components/project-docs';
import { ProjectFiles } from '../_components/project-files';
import { ProjectActivities } from '../_components/project-activities';
import { EditProjectModal } from '../_components/edit-project-modal';
import { LostStageModal } from '../_components/lost-stage-modal';
import { ProjectNotFound } from './_components/project-not-found';

import { useProjectDetail } from './_hooks/use-project-detail';
import { projectDetailService } from './_services/project-detail.service';
import type { ProjectTabId, UpdateProjectPayload } from './_types';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const { project, stages, notFound, isLoading, errorMsg, reload } = useProjectDetail(params?.id);

  const [tab, setTab] = useState<ProjectTabId>('proposal');
  const [edit, setEdit] = useState(false);
  const [lostStage, setLostStage] = useState<string | null>(null);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;

    const data = new FormData(event.currentTarget);
    const payload: UpdateProjectPayload = {
      name: String(data.get('name') || ''),
      code: String(data.get('code') || ''),
      value: Number(data.get('value') || 0),
      probability: Number(data.get('probability') || 0),
      expectedCloseDate: String(data.get('closeDate') || ''),
      stageId: String(data.get('stageId') || ''),
    };

    try {
      await projectDetailService.update(project.id, payload);
      toast.success('Đã lưu thay đổi');
      setEdit(false);
      await reload();
    } catch (err) {
      console.error(err);
    }
  }

  async function move(stageId: string, lostReason?: string) {
    if (!project) return;

    try {
      await projectDetailService.moveStage(project.id, { stageId, lostReason });
      toast.success('Đã cập nhật giai đoạn');
      setLostStage(null);
      await reload();
    } catch (err) {
      console.error(err);
    }
  }

  function chooseStage(stage: StageRow) {
    if (stage.isLost) {
      setLostStage(stage.id);
      return;
    }
    move(stage.id);
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Đang tải dự án…</div>;
  }

  if (notFound || !project) {
    return <ProjectNotFound />;
  }
  if (errorMsg || !project) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-[50vh]">
        <h2 className="text-lg font-bold text-destructive">Không thể tải dự án</h2>
        <p className="text-sm text-muted-foreground mt-2">{errorMsg || 'Dữ liệu không hợp lệ'}</p>
        <button onClick={() => reload()} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div>
      <ProjectHeader
        project={project}
        stages={stages}
        onEdit={() => setEdit(true)}
        onChooseStage={chooseStage}
      />

      <ProjectDocs
        projectId={project.id}
        docs={project.quotes || []}
        tab={tab}
        setTab={setTab}
      />

      <div className="mt-5">
        <ProjectFiles projectId={project.id} />
      </div>

      <ProjectActivities
        projectId={project.id}
        activities={project.activities}
        onSaved={reload}
      />

      <LostStageModal
        open={!!lostStage}
        onClose={() => setLostStage(null)}
        onSubmit={(reason) => move(lostStage!, reason)}
      />

      <EditProjectModal
        open={edit}
        onClose={() => setEdit(false)}
        project={project}
        stages={stages}
        onSubmit={handleSave}
      />
    </div>
  );
}