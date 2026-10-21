import type { ActivityEvent } from '../../types';
import { todayKey } from '../../utils';

export const DAY_MS = 86400000;

/**
 * XP rules (documented formula, deterministic):
 *  - exercise/answer events carry their own xp
 *  - level thresholds: level n costs 60 · n² xp total (so level = floor(sqrt(xp/60))+1)
 */
export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1;
}

export function xpRangeForLevel(level: number): { min: number; max: number } {
  return { min: 60 * (level - 1) ** 2, max: 60 * level ** 2 };
}

export function xpForExercise(scorePercent: number): number {
  return Math.round(Math.max(2, scorePercent * 0.12)); // 0 → 2 (participation), 100 → 12
}

/** Consecutive active days ending today or yesterday, based on recorded events only. */
export function streakFromEvents(events: Pick<ActivityEvent, 'ts'>[], now = Date.now()): number {
  const days = new Set(events.filter((e) => e.ts <= now).map((e) => todayKey(e.ts)));
  if (days.size === 0) return 0;
  const today = todayKey(now);
  let d: string;
  if (days.has(today)) d = today;
  else if (days.has(todayKey(now - DAY_MS))) d = todayKey(now - DAY_MS);
  else return 0;
  let streak = 0;
  // walk backwards over the Set of active days
  while (days.has(d)) {
    streak++;
    const [y, m, dd] = d.split('-').map(Number);
    const date = new Date(y, m - 1, dd);
    date.setDate(date.getDate() - 1);
    d = todayKey(date.getTime());
    if (streak > 400) break;
  }
  return streak;
}

export interface TopicAccuracy {
  topic: string;
  attempts: number;
  avg: number;
}

/** Average score per topic over recorded scored events (most recent first weighting: simple mean of last 10). */
export function topicAccuracy(events: ActivityEvent[]): TopicAccuracy[] {
  const byTopic = new Map<string, number[]>();
  for (const e of events) {
    if (e.score == null) continue;
    const key = e.topic ?? e.kind;
    const arr = byTopic.get(key) ?? [];
    arr.push(e.score);
    byTopic.set(key, arr);
  }
  return [...byTopic.entries()]
    .map(([topic, scores]) => ({
      topic,
      attempts: scores.length,
      avg: scores.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, scores.length),
    }))
    .sort((a, b) => a.avg - b.avg);
}

