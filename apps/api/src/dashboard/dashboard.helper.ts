export function sameMonth(value: Date, month: Date) {
  return value.getFullYear() === month.getFullYear() && value.getMonth() === month.getMonth();
}