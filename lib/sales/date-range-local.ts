/** YYYY-MM-DD in the user's local calendar. */
export function formatDateInputLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfDayLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function endOfDayLocal(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = startOfDayLocal(value);
  return Number.isFinite(d.getTime());
}

export function defaultMonthToDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: formatDateInputLocal(start), to: formatDateInputLocal(now) };
}

export function addDaysLocal(yyyyMmDd: string, deltaDays: number): string {
  const d = startOfDayLocal(yyyyMmDd);
  d.setDate(d.getDate() + deltaDays);
  return formatDateInputLocal(d);
}
