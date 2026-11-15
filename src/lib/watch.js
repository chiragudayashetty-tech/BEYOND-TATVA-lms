// Which 10-second parts of a video were really played (save_progress in the database, 20261115000002/3).
// A part counts when the video moved forward no faster than real time allows (up to 2× speed, plus
// slack): players such as Bunny report the time only every few seconds, and less often in the
// background. A seek moves far in almost no real time, so it marks nothing.
export const PART_SECONDS = 10;
const MAX_SPEED = 2.5;   // 2× playback + rounding
const SLACK = 2;         // seconds
const MAX_GAP = 20;      // real seconds between two reports that still count as playing (a long pause + seek doesn't)

// t = { last: number | null, lastAt: ms | null, seen: Set<number> }. Returns the parts newly seen at `pos`.
export function trackSeen(t, pos, now = Date.now()) {
  const added = [];
  const step = t.last == null ? null : pos - t.last;
  const real = t.lastAt == null ? 0 : Math.min(MAX_GAP, Math.max(0, (now - t.lastAt) / 1000));
  if (step != null && step > 0 && step <= real * MAX_SPEED + SLACK) {
    for (let p = Math.floor(t.last / PART_SECONDS); p <= Math.floor(pos / PART_SECONDS); p++) {
      if (!t.seen.has(p)) { t.seen.add(p); added.push(p); }
    }
  }
  t.last = pos;
  t.lastAt = now;
  return added;
}
