import React from 'react';

export function Card({
  className = '',
  children,
  tight,
  style,
}: {
  className?: string;
  children: React.ReactNode;
  tight?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`card ${tight ? 'tight' : ''} ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: 'copper' | 'outline' | 'err' | 'ok';
}) {
  return (
    <span className={`badge ${tone ?? ''}`} role="status">
      {children}
    </span>
  );
}

export function Button({
  children,
  className = '',
  primary,
  accent,
  danger,
  recording,
  small,
  onClick,
  disabled,
  title,
  type,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  primary?: boolean;
  accent?: boolean;
  danger?: boolean;
  recording?: boolean;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const cls = [className];
  if (primary) cls.push('primary');
  else if (accent) cls.push('accent');
  else if (danger) cls.push('danger');
  if (recording) cls.push('recording');
  if (small) cls.push('small');
  return (
    <button
      type={type ?? 'button'}
      className={`btn ${cls.join(' ')}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Stat({ num, lbl }: { num: React.ReactNode; lbl: string }) {
  return (
    <div className="stat">
      <div className="num">{num}</div>
      <div className="lbl">{lbl}</div>
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Divider() {
  return <hr className="divider" />;
}

export function EmptyState({
  title,
  note,
  action,
}: {
  title: string;
  note?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state">
      <div className="big">{title}</div>
      {note ? <p>{note}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state error">
      <div className="big">Something went wrong</div>
      <p>{message}</p>
    </div>
  );
}

export function Loading({ note }: { note?: string }) {
  return (
    <div className="state">
      <div className="spinner" aria-hidden="true" />
      <div className="muted">{note ?? 'Loading…'}</div>
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      Sample data — shown on purpose for the tour, not your real progress.
    </div>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return <div className="callout">{children}</div>;
}

/** Simple bar chart (SVG, no dependencies). */
/** Shared chart chrome: y-grid + baseline + value labels, in the app palette. */
const GRID = '#E3D9C8';
const LABEL = '#52645E';

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Simple bar chart (SVG, no dependencies). */
export function BarChart({
  items,
  max,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  max?: number;
}) {
  const hi = Math.max(max ?? 100, 1);
  const w = Math.max(items.length * 64, 200);
  const bars = items.map((it, i) => {
    const h = Math.max(Math.round((Math.min(it.value, hi) / hi) * 84), 2);
    return { ...it, i, h, u: it.value / hi };
  });
  return (
    <svg viewBox={`0 0 ${w} 122`} className="chart-wrap" role="img" aria-label="bar chart">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="6" x2={w - 6} y1={104 - f * 84} y2={104 - f * 84} stroke={GRID} strokeDasharray="3 4" />
      ))}
      {bars.map((b) => (
        <g key={b.label + b.i}>
          <rect
            x={b.i * 64 + 12}
            y={104 - b.h}
            width={40}
            height={b.h}
            rx={6}
            fill={b.u > 0.9 ? 'var(--ok)' : b.color ?? '#C18D62'}
          />
          <text x={b.i * 64 + 32} y={104 - b.h - 5} textAnchor="middle" fontSize="9.5" fill={LABEL} fontWeight="600">
            {formatValue(b.value)}
          </text>
          <text x={b.i * 64 + 32} y={117} textAnchor="middle" fontSize="9" fill={LABEL}>
            {b.label}
          </text>
        </g>
      ))}
      <line x1="6" x2={w - 6} y1="104" y2="104" stroke={GRID} />
    </svg>
  );
}

/** Line chart for trends (SVG). */
export function LineChart({
  points,
  max,
  min = 0,
}: {
  points: Array<{ x: string; y: number | null }>;
  max: number;
  min?: number;
}) {
  const gid = React.useId().replace(/:/g, '');
  if (points.length === 0) return null;
  const w = Math.max(points.length * 48, 220);
  const yOf = (v: number) => 110 - ((v - min) / Math.max(1, max - min)) * 96;
  const xy: Array<[number, number]> = [];
  points.forEach((p, i) => {
    if (p.y == null) return;
    xy.push([i * 48 + 24, yOf(p.y)]);
  });
  if (xy.length === 0) return null;
  const d = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1].toFixed(1)}`).join(' ');
  const area =
    xy.length > 1
      ? `${d} L${xy[xy.length - 1][0]},104 L${xy[0][0]},104 Z`
      : '';
  const lastVal = points.filter((p) => p.y != null).slice(-1)[0];
  return (
    <svg viewBox={`0 0 ${w} 122`} className="chart-wrap" role="img" aria-label="trend chart">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C3D7CD" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C3D7CD" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="6"
          x2={w - 6}
          y1={yOf(min + f * (max - min))}
          y2={yOf(min + f * (max - min))}
          stroke={GRID}
          strokeDasharray="3 4"
        />
      ))}
      {area ? <path d={area} fill={`url(#${gid})`} /> : null}
      <path d={d} fill="none" stroke="#173C35" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="#C18D62" stroke="#fffdf8" strokeWidth="1.2" />
      ))}
      <text x={w - 6} y={yOf(lastVal.y!) - 6} textAnchor="end" fontSize="9.5" fill={LABEL} fontWeight="600">
        {formatValue(lastVal.y!)}
      </text>
      <line x1="6" x2={w - 6} y1="104" y2="104" stroke={GRID} />
    </svg>
  );
}

/** Crash guard: keeps the shell alive and states the fact plainly. */
export function ErrorBoundaryFallback({ error }: { error: Error }) {
  return (
    <div className="state" style={{ padding: 24 }}>
      <div className="big">Something broke, not you.</div>
      <p className="muted">
        The page hit an error and was stopped rather than showing wrong data.
        Reload to continue; your local progress is intact.
      </p>
      <p className="tiny" style={{ maxWidth: '62ch' }}>
        <code>{error.message}</code>
      </p>
      <button className="btn primary" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
}
