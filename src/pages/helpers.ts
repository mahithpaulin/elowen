/** Shared tiny helpers. */

export function toLevelPct(xp: number, min: number, max: number): number {
  if (max <= min) return 100;
  return Math.max(0, Math.min(100, Math.round(((xp - min) / (max - min)) * 100)));
}

export function wordDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
