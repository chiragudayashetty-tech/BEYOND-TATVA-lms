// Generated cover artwork for a course, so every card looks designed before real thumbnails exist.
// Deterministic: the same seed always draws the same picture.

function rand(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Picks a real frame from the course's footage when it has some; "" / "hero" / "poster" use the key frame.
export function frameFor(course, seed = "") {
  const f = course.frames;
  if (!f?.length) return null;
  if (!seed || seed === "hero" || seed === "poster") return `/media/frames/${f[0]}.jpg`;
  const n = Number(seed.split("-").pop());
  const i = Number.isFinite(n) ? n : Math.floor(rand(seed)() * 1000);
  return `/media/frames/${f[i % f.length]}.jpg`;
}

export default function Art({ course, seed = "", className = "" }) {
  const src = frameFor(course, seed);
  if (src) {
    return (
      <span className={`relative block h-full w-full ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/5 to-transparent" />
      </span>
    );
  }
  return <GeneratedArt course={course} seed={seed} className={className} />;
}

function GeneratedArt({ course, seed, className }) {
  const { color, color2, art } = course;
  const r = rand(course.id + seed);
  const id = `a${Math.floor(r() * 1e9)}`;
  const W = 1600;
  const H = 900;

  let pattern = null;
  if (art === "rings") {
    const cx = W * (0.62 + r() * 0.25);
    const cy = H * (0.3 + r() * 0.4);
    pattern = Array.from({ length: 8 }, (_, i) => (
      <circle key={i} cx={cx} cy={cy} r={90 + i * 80} fill="none" stroke="#fff" strokeOpacity={0.55 - i * 0.06} strokeWidth={i % 2 ? 6 : 18} />
    ));
  } else if (art === "grid") {
    const dots = [];
    for (let x = 0; x < 14; x++)
      for (let y = 0; y < 8; y++)
        if (r() > 0.45) dots.push(<circle key={`${x}-${y}`} cx={W * 0.45 + x * 70} cy={60 + y * 110} r={r() > 0.8 ? 22 : 10} fill="#fff" fillOpacity={0.25 + r() * 0.5} />);
    pattern = <g>{dots}</g>;
  } else if (art === "waves") {
    pattern = Array.from({ length: 6 }, (_, i) => {
      const y = H * 0.2 + i * 130;
      const a = 80 + r() * 60;
      return <path key={i} d={`M0 ${y} C ${W * 0.3} ${y - a}, ${W * 0.6} ${y + a}, ${W} ${y - a / 2}`} fill="none" stroke="#fff" strokeOpacity={0.2 + i * 0.08} strokeWidth="28" strokeLinecap="round" />;
    });
  } else {
    pattern = Array.from({ length: 6 }, (_, i) => (
      <circle key={i} cx={W * (0.45 + r() * 0.55)} cy={H * r()} r={70 + r() * 200} fill={i % 2 ? "#fff" : color} fillOpacity={i % 2 ? 0.35 : 0.55} />
    ));
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color2} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id}g)`} />
      {pattern}
      {/* Playful sparkle */}
      <path transform={`translate(${W * (0.75 + r() * 0.15)} ${H * (0.15 + r() * 0.2)}) scale(${2 + r() * 2})`} d="M0-20 C3-5 5-3 20 0 C5 3 3 5 0 20 C-3 5 -5 3 -20 0 C-5-3 -3-5 0-20Z" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}
