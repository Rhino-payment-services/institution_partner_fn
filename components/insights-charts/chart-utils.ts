export function chartShortDate(isoDay: string) {
  try {
    const d = new Date(isoDay + "T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return isoDay;
  }
}

export function trimChartSeries<T extends { day: string }>(rows: T[], max = 45): T[] {
  if (rows.length <= max) return rows;
  return rows.slice(-max);
}
