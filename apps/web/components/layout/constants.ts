import {
  Blocks, CalendarDays, ChartNoAxesCombined, FileSignature,
  FolderKanban, Layers3, LayoutDashboard, ListTodo,
  Settings, UsersRound, LifeBuoy
} from 'lucide-react';

export const NAV_GROUPS = [
  {
    title: 'Tổng quan',
    items: [
      { href: '/', label: 'Tổng quan', icon: LayoutDashboard },
      { href: '/reports', label: 'Báo cáo', icon: ChartNoAxesCombined },
    ],
  },
  {
    title: 'Bán hàng (CRM)',
    items: [
      { href: '/customers', label: 'Khách hàng', icon: UsersRound },
      { href: '/deals', label: 'Cơ hội', icon: Layers3 },
      { href: '/projects', label: 'Dự án', icon: FolderKanban },
      { href: '/quotes', label: 'Báo giá', icon: FileSignature },
    ],
  },
  {
    title: 'Vận hành & CSKH',
    items: [
      { href: '/tasks', label: 'Công việc', icon: ListTodo },
      { href: '/calendar', label: 'Lịch', icon: CalendarDays },
      { href: '/tickets', label: 'Hỗ trợ', icon: LifeBuoy },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/integrations', label: 'Integration Hub', icon: Blocks },
      { href: '/settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];

export const CREATE_ITEMS = [
  { href: '/customers', label: 'Khách hàng', icon: UsersRound },
  { href: '/deals', label: 'Cơ hội', icon: Layers3 },
  { href: '/tasks', label: 'Công việc', icon: ListTodo },
];

export function openSearch() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
}