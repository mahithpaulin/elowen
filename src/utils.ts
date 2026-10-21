export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, x));

export const mean = (xs: number[]): number =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Mean absolute deviation — robust spread measure. */
export function mad(xs: number[]): number {
  const m = median(xs);
  return mean(xs.map((x) => Math.abs(x - m)));
}

/**
 * Coefficient of variation using median/MAD. Null-safe: returns null when the
 * centre value is ~0 or there are too few samples.
 */
export function robustCV(xs: number[]): number | null {
  if (xs.length < 3) return null;
  const m = median(xs);
  if (m < 1e-9) return null;
  const cv = mad(xs) / m;
  return isFinite(cv) ? cv : null;
}

export function percentile(xs: number[], p: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const idx = clamp(Math.round((s.length - 1) * p), 0, s.length - 1);
  return s[idx];
}

export function linearFit(xs: number[], ys: number[]): { slope: number; intercept: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: n ? ys[0] : 0 };
  const mx = mean(xs),
    my = mean(ys);
  let num = 0,
    den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

export function uid(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

/** Normalise learner-typed answers: casefold, trim, collapse whitespace, drop trailing punctuation. */
export function normaliseText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.。!?]+$/u, '')
    .trim();
}

export function shuffle<T>(xs: T[], seed = 7): T[] {
  const out = [...xs];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function todayKey(ts = Date.now()): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayKeyAdd(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m, d);
  date.setDate(date.getDate() + days);
  return todayKey(date.getTime());
}

export function dayKeyDiff(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round(((new Date(ay, am - 1, ad)).getTime() - (new Date(by, bm - 1, bd)).getTime()) / 86400000);
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}
