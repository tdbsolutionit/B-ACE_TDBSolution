'use client';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import type { ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { OPPORTUNITY_STATUS_LABELS } from '../../_constants';

interface ProjectsTabProps {
  projects: ProjectRow[];
  onAdd: () => void;
}

function extractProjectCode(project: ProjectRow): string | undefined {
  return project.code || project.description?.match(/Mã dự án: ([^|]+)/)?.[1]?.trim();
}

function extractStatusText(project: ProjectRow): string | undefined {
  return project.description?.match(/Tình trạng: (.*)/)?.[1]?.trim();
}

function resolveStatusClass(project: ProjectRow): string {
  const text = extractStatusText(project);
  if (text) {
    const lowered = text.toLowerCase();
    return lowered.includes('done') || lowered.includes('triển khai')
      ? 'status-badge status-success'
      : 'status-badge status-blue';
  }
  if (project.status === 'won') return 'status-badge status-success';
  if (project.status === 'lost') return 'status-badge status-warning';
  return 'status-badge status-blue';
}

export function ProjectsTab({ projects, onAdd }: ProjectsTabProps) {
  const router = useRouter();
  const perm = usePermission();
  const canCreate = perm.has('deal:create');

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Danh sách dự án và cơ hội
          </p>
          <p className="text-xs text-muted-foreground">
            Tổng cộng {projects.length} dự án liên kết với khách hàng này
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus size={16} /> Thêm dự án
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Chưa có dự án nào cho khách hàng này.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="crm-table w-full">
            <thead>
              <tr>
                <th className="whitespace-nowrap">MÃ DỰ ÁN</th>
                <th>TÊN DỰ ÁN</th>
                <th>GIAI ĐOẠN</th>
                <th>TÌNH TRẠNG</th>
                <th>GIÁ TRỊ</th>
                <th>XÁC SUẤT</th>
                <th>NGÀY DỰ KIẾN / NHẬN</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const code = extractProjectCode(project);
                const statusText = extractStatusText(project);
                return (
                  <tr
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      if (project.id) {
                        window.location.href = `/projects/${project.id}`;
                      }
                    }}
                  >
                    <td className="whitespace-nowrap font-mono text-xs font-semibold text-primary">
                      {code || '—'}
                    </td>
                    <td>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {project.isLead ? 'Lead' : 'Cơ hội'}
                      </p>
                    </td>
                    <td>
                      <span
                        className="stage-badge"
                        style={{
                          background: `${project.stageColor}20`,
                          color: project.stageColor,
                        }}
                      >
                        {project.stage}
                      </span>
                    </td>
                    <td>
                      {statusText ? (
                        <span className={resolveStatusClass(project)}>{statusText}</span>
                      ) : (
                        <span
                          className={
                            project.status === 'won'
                              ? 'status-badge status-success'
                              : project.status === 'lost'
                              ? 'status-badge status-warning'
                              : 'status-badge status-blue'
                          }
                        >
                          {OPPORTUNITY_STATUS_LABELS[project.status]}
                        </span>
                      )}
                    </td>
                    <td className="font-medium">
                      {project.value > 0 ? compactMoney(project.value) : '—'}
                    </td>
                    <td>
                      {project.isLead ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${project.probability}%` }}
                            />
                          </div>
                          <span className="text-xs">{project.probability}%</span>
                        </div>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {project.closeDate || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}