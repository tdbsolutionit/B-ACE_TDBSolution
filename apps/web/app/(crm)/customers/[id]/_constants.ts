export const CUSTOMER_STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
};

export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  open: 'Đang mở',
  won: 'Thắng',
  lost: 'Thua',
};

export const CUSTOMER_CHANGED_EVENT = 'customer:changed';