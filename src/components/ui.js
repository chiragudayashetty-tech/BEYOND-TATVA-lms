import Link from "next/link";
import { ChevronRight } from "lucide-react";

// Small shared building blocks used across every role's pages.

const tones = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-muted",
};

export function IconTile({ icon: Icon, tone = "primary", size = "md" }) {
  const s = size === "lg" ? "h-12 w-12 [&>svg]:h-6 [&>svg]:w-6" : size === "sm" ? "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4" : "h-10 w-10 [&>svg]:h-5 [&>svg]:w-5";
  return <span className={`grid shrink-0 place-items-center rounded-xl ${s} ${tones[tone]}`}><Icon /></span>;
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Card({ title, action, children, className = "", pad = true }) {
  return (
    <section className={`card ${pad ? "p-5" : ""} ${className}`}>
      {(title || action) && (
        <div className={`mb-4 flex items-center justify-between gap-3 ${pad ? "" : "px-5 pt-5"}`}>
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ViewAll({ href, children = "View all" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:underline">
      {children} <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

export function StatCard({ label, value, hint, icon, tone = "primary" }) {
  return (
    <div className="card flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <div className="text-xs text-muted sm:text-sm">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tracking-tight sm:mt-1.5 sm:text-3xl">{value}</div>
        {hint && <div className="mt-1 truncate text-xs text-muted">{hint}</div>}
      </div>
      {icon && <span className="hidden sm:block"><IconTile icon={icon} tone={tone} /></span>}
    </div>
  );
}

export function Progress({ value, tone = "primary", className = "h-2" }) {
  const bar = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div className={`w-full overflow-hidden rounded-full bg-surface-2 ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 140, stroke = 12, tone = "primary", children }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = { primary: "var(--primary)", success: "var(--success)", warning: "var(--warning)" }[tone];
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

// Minimal line chart: points are 0..max values, labels sit under the x axis.
export function LineChart({ points, labels, max = 100, height = 180 }) {
  const w = 600;
  const h = height;
  const pad = 8;
  const step = (w - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => [pad + i * step, h - pad - (p / max) * (h - pad * 2)]);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L${xy.at(-1)[0]},${h} L${xy[0][0]},${h} Z`;
  const last = xy.at(-1);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-auto w-full" preserveAspectRatio="none" style={{ height }}>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--border)" strokeDasharray="4 6" />
        ))}
        <path d={area} fill="var(--primary)" fillOpacity="0.08" />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <circle cx={last[0]} cy={last[1]} r="6" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && (
        <div className="mt-2 flex justify-between text-xs text-subtle">
          {labels.map((l) => <span key={l}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

export function Bars({ data, max, height = 160, valueLabel = (v) => v }) {
  const top = max ?? Math.max(...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: height + 24 }}>
      {data.map((d) => (
        <div key={d.label} className="group flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full max-w-9 flex-col justify-end" style={{ height }}>
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium text-muted opacity-0 transition group-hover:opacity-100">{valueLabel(d.value)}</span>
            <div className="flex w-full flex-col overflow-hidden rounded-t-lg rounded-b-sm" style={{ height: `${((d.value + (d.extra ?? 0)) / top) * height}px` }}>
              {d.extra != null && <div className="w-full flex-1 bg-surface-2 ring-1 ring-inset ring-border" />}
              <div className={`w-full ${d.active || d.extra != null ? "bg-primary" : "bg-primary/60"}`} style={{ height: `${(d.value / (d.value + (d.extra ?? 0))) * 100}%` }} />
            </div>
          </div>
          <span className="text-xs text-subtle">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Avatar({ name = "", size = "h-9 w-9 text-sm" }) {
  const initials = name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return <span className={`grid shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary ${size}`}>{initials || "?"}</span>;
}

export function Empty({ icon, title, body, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <IconTile icon={icon} tone="neutral" size="lg" />
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
