'use client';

import { ActivityForm } from '@/components/shared/activity-form';

interface ProjectActivitiesProps {
  projectId: string;
  activities: Array<{ id: string; subject: string; content: string | null; createdAt: string; owner: string }>;
  onSaved: () => void;
}

export function ProjectActivities({ projectId, activities, onSaved }: ProjectActivitiesProps) {
  return (
    <div className="data-panel mt-5">
      <h2 className="mb-3 text-sm font-semibold">Hoạt động gần đây</h2>
      <ActivityForm relatedType="opportunity" relatedId={projectId} onSaved={onSaved} />
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hoạt động.</p>
      ) : (
        activities.map((item) => (
          <div key={item.id} className="border-l-2 border-primary/30 py-2 pl-3 mt-2">
            <p className="text-sm">{item.subject}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{item.owner} · {item.createdAt}</p>
          </div>
        ))
      )}
    </div>
  );
}