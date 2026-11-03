export const PRIORITY: Record<string, string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dueFlags(status: string, dueDate: Date | null) {
  if (status !== 'pending' || !dueDate) {
    return { overdue: false, dueToday: false, dueTomorrow: false };
  }
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = startOfToday().getTime();
  const day = 24 * 60 * 60 * 1000;
  return {
    overdue: due.getTime() < today,
    dueToday: due.getTime() === today,
    dueTomorrow: due.getTime() === today + day,
  };
}