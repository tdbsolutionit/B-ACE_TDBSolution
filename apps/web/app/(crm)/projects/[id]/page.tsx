'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { type DocCard, type ProjectRow, type StageRow } from '@/lib/crm';
import { ProjectHeader } from '../_components/project-header';
import { ProjectDocs } from '../_components/project-docs';
import { ProjectFiles } from '../_components/project-files';
import { ProjectActivities } from '../_components/project-activities';
import { EditProjectModal } from '../_components/edit-project-modal';
import { LostStageModal } from '../_components/lost-stage-modal';

type Detail = ProjectRow & {
  lostReason?: string | null;
  quotes: DocCard[];
  activities: Array<{ id: string; subject: string; content: string | null; createdAt: string; owner: string }>;
};

type TabId = 'proposal' | 'quote' | 'po';

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<Detail | null>(null);
  const [stages, setStages] = useState<StageRow[]>([]);
  const [tab, setTab] = useState<TabId>('proposal');
  const [edit, setEdit] = useState(false);
  const [lostStage, setLostStage] = useState<string | null>(null);

  async function load() {
    try {
      const row = await api<Detail>(`/opportunities/${params.id}`);
      if (!row) throw new Error('Không tìm thấy dự án');
      setProject(row);
    } catch (err: any) {
      console.error(err); // api() đã bắn toast
    }
  }

  useEffect(() => {
    load();
    api<StageRow[]>('/opportunities/stages').then(setStages).catch(() => setStages([]));
  }, [params.id]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api(`/opportunities/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: String(data.get('name') || ''),
          code: String(data.get('code') || ''),
          value: Number(data.get('value') || 0),
          probability: Number(data.get('probability') || 0),
          expectedCloseDate: String(data.get('closeDate') || ''),
          stageId: String(data.get('stageId') || ''),
        }),
      });
      toast.success('Đã lưu thay đổi');
      setEdit(false);
      await load();
    } catch (err) {
      console.error(err);
    }
  }

  async function move(stageId: string, lostReason?: string) {
    try {
      await api(`/opportunities/${params.id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId, ...(lostReason ? { lostReason } : {}) }),
      });
      toast.success('Đã cập nhật giai đoạn');
      setLostStage(null);
      await load();
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

  if (!project) return <p className="p-8 text-sm text-muted-foreground text-center">Đang tải dự án…</p>;

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
        onSaved={load}
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