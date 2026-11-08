// The next "1st Sunday of the month" on or after `from` (newsletter day), as a Date at local midnight.
export function nextFirstSunday(from = new Date()) {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let i = 0; i < 2; i++) {
    const first = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const sunday = new Date(first.getFullYear(), first.getMonth(), 1 + ((7 - first.getDay()) % 7));
    if (sunday >= start) return sunday;
  }
  return null;
}
