// Which 10-second parts of a video were really played (save_progress in the database, 20261115000002).
// A part counts only during normal playback: a jump forward (seek) of more than 3 s marks nothing.
export const PART_SECONDS = 10;
const MAX_STEP = 3;   // players report every ~0.25–1 s, even at 2× speed

// t = { last: number | null, seen: Set<number> }. Returns the parts newly seen by moving to `pos`.
export function trackSeen(t, pos) {
  const added = [];
  const step = t.last == null ? null : pos - t.last;
  if (step != null && step > 0 && step <= MAX_STEP) {
    for (let p = Math.floor(t.last / PART_SECONDS); p <= Math.floor(pos / PART_SECONDS); p++) {
      if (!t.seen.has(p)) { t.seen.add(p); added.push(p); }
    }
  }
  t.last = pos;
  return added;
}
