import React from 'react';

export function Card({
  className = '',
  children,
  tight,
}: {
  className?: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return <div className={`card ${tight ? 'tight' : ''} ${className}`}>{children}</div>;
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
export function BarChart({
  items,
  max,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  max?: number;
}) {
  const hi = Math.max(max ?? 100, 1);
  return (
    <svg viewBox={`0 0 ${Math.max(items.length * 64, 200)} 120`} className="chart-wrap" role="img" aria-label="bar chart">
      {items.map((it, i) => {
        const h = Math.round((it.value / hi) * 92);
        return (
          <g key={it.label + i}>
            <rect x={i * 64 + 12} y={104 - h} width={40} height={h} rx={6} fill={it.color ?? '#C18D62'} />
            <text x={i * 64 + 32} y={117} textAnchor="middle" fontSize="9" fill="#52645E" fontFamily="inherit">
              {it.label}
            </text>
          </g>
        );
      })}
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
  if (points.length === 0) return null;
  const w = Math.max(points.length * 48, 220);
  const y = (v: number | null) => (v == null ? null : 110 - ((v - min) / Math.max(1, max - min)) * 96);
  let d = '';
  let prevXy: Array<[number, number]> = [];
  points.forEach((p, i) => {
    const yy = y(p.y);
    if (yy == null) return;
    prevXy.push([i * 48 + 24, yy]);
  });
  d = prevXy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} 120`} className="chart-wrap" role="img" aria-label="trend chart">
      <path d={d} fill="none" stroke="#173C35" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {prevXy.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.2" fill="#C18D62" />
      ))}
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
