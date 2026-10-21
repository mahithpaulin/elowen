import type { SrsCard } from '../types';

/**
 * Spaced repetition — SM-2 lite.
 *
 * Deterministic, documented formula:
 *  quality 0..5 (0–2 = forgotten, 3 = hard recall, 4–5 = good recall)
 *  ease'    = clamp(ease + 0.1 − (5−q)·(0.08 + (5−q)·0.02), 1.3, 3.0)
 *  interval q < 3 → 1 day (lapse: +1 difficulty/interval reset)
 *           q = 3 → max(interval, 1) · 1.2
 *           q ≥ 4 → reps == 0 ? 1 : reps == 1 ? 3 : interval · ease
 * due = lastTs + interval·(23.5 h)  (slightly under a day so "today" reviews stay today)
 */
export interface SrsUpdate {
  ease: number;
  interval: number;
  due: number;
  reps: number;
  lapses: number;
}

export function srsUpdate(
  card: Pick<SrsCard, 'ease' | 'interval' | 'reps' | 'lapses'>,
  quality: number,
  now = Date.now(),
): SrsUpdate {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  const clampedEase = Math.max(1.3, Math.min(3.0, card.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const remembered = q >= 3;
  let interval: number;
  let ease = clampedEase;
  let reps = card.reps;
  let lapses = card.lapses;
  if (!remembered) {
    interval = 1;
    ease = Math.max(1.3, clampedEase - 0.1);
    reps = 0;
    lapses = card.lapses + 1;
  } else {
    if (card.reps === 0) interval = 1;
    else if (card.reps === 1) interval = q === 3 ? 1 : 3;
    else interval = q === 3 ? Math.max(card.interval, 1) * 1.2 : Math.round(card.interval * ease);
    reps = card.reps + 1;
  }
  interval = Math.max(1, Math.round(interval));
  return { ease, interval, due: now + interval * 23.5 * 3600_000, reps, lapses };
}

export function isDue(card: SrsCard, now = Date.now()): boolean {
  return card.due <= now;
}

export const QUALITY_LABELS = ['Lost it', 'Lost it', 'Lost it', 'Hard', 'Good', 'Easy'] as const;
