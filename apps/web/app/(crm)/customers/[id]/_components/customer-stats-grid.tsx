import { CheckCircle, FolderKanban, TrendingUp, Wallet } from 'lucide-react';
import type { ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { StatCard } from './ui/stat-card';

interface CustomerStatsGridProps {
  projects: ProjectRow[];
}

export function CustomerStatsGrid({ projects }: CustomerStatsGridProps) {
  const won = projects.filter((p) => p.status === 'won');
  const open = projects.filter((p) => p.status === 'open' && !p.isLead);
  const leads = projects.filter((p) => p.isLead);
  const pipeline = open.reduce((sum, p) => sum + p.value, 0);
  const wonValue = won.reduce((sum, p) => sum + p.value, 0);

  return (
    <div
      className="mb-3 grid gap-2"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}
    >
      <StatCard
        icon={<FolderKanban size={20} />}
        label="Tổng dự án"
        value={String(projects.length)}
        note={`${leads.length} lead · ${open.length + won.length} cơ hội`}
        tone="bg-primary/10 text-primary"
      />
      <StatCard
        icon={<TrendingUp size={20} />}
        label="Đang triển khai"
        value={String(open.length)}
        tone="bg-blue-100 text-blue-600"
      />
      <StatCard
        icon={<CheckCircle size={20} />}
        label="Đã thắng"
        value={String(won.length)}
        note={compactMoney(wonValue)}
        tone="bg-green-100 text-green-600"
      />
      <StatCard
        icon={<Wallet size={20} />}
        label="Pipeline"
        value={compactMoney(pipeline)}
        tone="bg-amber-100 text-amber-600"
      />
    </div>
  );
}