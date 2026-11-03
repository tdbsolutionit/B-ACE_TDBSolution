export type PermissionAction = 'read' | 'create' | 'update' | 'delete';

export type PermissionModule = {
  key: string;
  label: string;
  actions: PermissionAction[];
};

export const ACTION_LABELS: Record<PermissionAction, string> = {
  read: 'Xem',
  create: 'Thêm',
  update: 'Sửa',
  delete: 'Xóa',
};

export const PERMISSION_MODULES: PermissionModule[] = [
  { key: 'CUSTOMER', label: 'Khách hàng', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'DEAL', label: 'Cơ hội (Deal)', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'PROJECT', label: 'Dự án', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'QUOTE', label: 'Báo giá', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'TASK', label: 'Công việc', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'TICKET', label: 'Hỗ trợ (Ticket)', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'CALENDAR', label: 'Lịch', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'REPORT', label: 'Báo cáo', actions: ['read'] },
  { key: 'USER', label: 'Người dùng', actions: ['read', 'create', 'update', 'delete'] },
  { key: 'INTEGRATION', label: 'Tích hợp', actions: ['read', 'update'] },
  { key: 'SETTING', label: 'Cài đặt', actions: ['read', 'update'] },
];