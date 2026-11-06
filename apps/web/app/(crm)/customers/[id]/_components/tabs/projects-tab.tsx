'use client';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useMemo } from 'react';
import type { ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { usePermission } from '@/hooks/use-permission';
import { OPPORTUNITY_STATUS_LABELS } from '../../_constants';
import { useSort } from '@/hooks/use-sort';
import { SortableHeader } from '@/components/shared/sortable-header';

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

  // 1. Quản lý state sort
  const { sortBy, sortOrder, handleSort } = useSort('updatedAt', 'desc');

  // 2. Sắp xếp dữ liệu trực tiếp trên Client
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      let valA: any = a[sortBy as keyof ProjectRow];
      let valB: any = b[sortBy as keyof ProjectRow];

      // Xử lý riêng cho các trường đặc thù không có sẵn trong object gốc
      if (sortBy === 'stage') { valA = a.stage; valB = b.stage; }
      if (sortBy === 'code') { valA = extractProjectCode(a) || ''; valB = extractProjectCode(b) || ''; }

      // Xử lý so sánh
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), 'vi');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [projects, sortBy, sortOrder]);

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
                {/* 3. Thay thế thẻ th bằng SortableHeader */}
                <SortableHeader label="MÃ DỰ ÁN" field="code" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} className="whitespace-nowrap" />
                <SortableHeader label="TÊN DỰ ÁN" field="name" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="GIAI ĐOẠN" field="stage" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <th>TÌNH TRẠNG</th> {/* Tình trạng phức tạp nên tạm ẩn sort */}
                <SortableHeader label="GIÁ TRỊ" field="value" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="XÁC SUẤT" field="probability" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="NGÀY DỰ KIẾN / NHẬN" field="closeDate" currentSortBy={sortBy} currentSortOrder={sortOrder} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {/* 4. Dùng mảng đã sort */}
              {sortedProjects.map((project) => {
                const code = extractProjectCode(project);
                const statusText = extractStatusText(project);
                return (
                  <tr
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      if (project.id) {
                        // 5. Dùng router.push thay vì window.location.href
                        router.push(`/projects/${project.id}`);
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