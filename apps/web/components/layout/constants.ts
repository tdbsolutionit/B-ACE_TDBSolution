import {
  Blocks, CalendarDays, ChartNoAxesCombined, FileSignature,
  FolderKanban, Layers3, LayoutDashboard, ListTodo,
  Settings, UsersRound,
} from 'lucide-react';

export const NAV = [
  { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/customers', label: 'Khách hàng', icon: UsersRound },
  { href: '/deals', label: 'Cơ hội', icon: Layers3 },
  { href: '/projects', label: 'Dự án', icon: FolderKanban },
  { href: '/quotes', label: 'Báo giá', icon: FileSignature },
  { href: '/tasks', label: 'Công việc', icon: ListTodo },
  { href: '/calendar', label: 'Lịch', icon: CalendarDays },
  { href: '/reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
  { href: '/integrations', label: 'Integration Hub', icon: Blocks },
  { href: '/settings', label: 'Cài đặt', icon: Settings },
];

export const CREATE_ITEMS = [
  { href: '/customers', label: 'Khách hàng', icon: UsersRound },
  { href: '/deals', label: 'Cơ hội', icon: Layers3 },
  { href: '/tasks', label: 'Công việc', icon: ListTodo },
];

// Mở command palette (giống bấm Cmd/Ctrl + K)
export function openSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
}