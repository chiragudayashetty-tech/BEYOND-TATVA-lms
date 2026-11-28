// Offline watch time (src/lib/offline.js → save_progress). The server takes only a few new parts per save
// (anti-cheat), so a long offline watch needs several saves. After a save: keep the record (and send it again)
// while the % watched still goes up; drop it once it stops, reaches 100, or after 60 tries.
export function afterSave(record, { pct, error }) {
  if (error) return null; // caller decides: network errors keep the record untouched
  const tries = (record.tries ?? 0) + 1;
  const more = Number.isFinite(pct) && pct < 100 && pct > (record.lastPct ?? -1) && tries < 60 && (record.seen ?? []).length > 0;
  return more ? { ...record, lastPct: pct, tries } : undefined; // undefined = drop
}
