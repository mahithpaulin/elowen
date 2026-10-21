import { describe, expect, it } from 'vitest';
import { levelFromXp, xpRangeForLevel, streakFromEvents, topicAccuracy } from '../src/engines/scoring/scoring';
import { srsUpdate } from '../src/engines/srs';
import type { ActivityEvent, SrsCard } from '../src/types';

const ev = (dayOffset: number, score = 80, topic = 'tenses'): ActivityEvent => ({
  id: `e${dayOffset}`,
  ts: Date.now() - dayOffset * 86400000,
  kind: 'lesson',
  topic,
  score,
  xp: 10,
});

describe('levelFromXp', () => {
  it('curve gives level 1 at 0 xp', () => {
    expect(levelFromXp(0)).toBe(1);
  });
  it('level 2 at 60 xp, level 3 at 240', () => {
    expect(levelFromXp(60)).toBe(2);
    expect(levelFromXp(239)).toBe(2);
    expect(levelFromXp(240)).toBe(3);
  });
  it('range boundaries cover xp', () => {
    const r = xpRangeForLevel(2);
    expect(r.min).toBe(60);
    expect(r.max).toBe(240);
  });
});

describe('streakFromEvents', () => {
  it('counts consecutive days including today', () => {
    const events = [ev(0), ev(1), ev(2), ev(4)];
    expect(streakFromEvents(events)).toBe(3);
  });
  it('keeps a yesterday-run alive until today closes without a new event', () => {
    expect(streakFromEvents([ev(1), ev(2)])).toBe(2);
    expect(streakFromEvents([ev(2), ev(3)])).toBe(0);
  });
});

describe('topicAccuracy', () => {
  it('groups scores by topic, weakness ascending', () => {
    const list: ActivityEvent[] = [
      ev(1, 90, 'articles'),
      ev(2, 95, 'articles'),
      ev(1, 40, 'tenses'),
      ev(2, 50, 'tenses'),
    ];
    const result = topicAccuracy(list);
    expect(result[0]!.topic).toBe('tenses');
    expect(result[1]!.avg).toBeCloseTo(92.5);
  });
  it('uses at most the last 10 attempts', () => {
    const list: ActivityEvent[] = Array.from({ length: 15 }, (_, i) => ev(15 - i, 100 + i - 100));
    const result = topicAccuracy(list.filter((e) => e.score != null));
    expect(result[0]!.attempts).toBeLessThanOrEqual(15);
  });
});

describe('srsUpdate (SM-2 lite)', () => {
  const card = (ease = 2.5, interval = 0, reps = 0, lapses = 0): SrsCard => ({
    wordId: 'w1', ease, interval, due: 0, reps, lapses, lastTs: 0,
  });
  it('first learning is +1 day', () => {
    const next = srsUpdate(card(), 4);
    expect(next.interval).toBe(1);
    expect(next.reps).toBe(1);
  });
  it('grows with resilience on success', () => {
    const c = card(2.5, 3, 2);
    const next = srsUpdate(c, 5);
    expect(next.interval).toBeGreaterThanOrEqual(3);
  });
  it('lapse resets reps and grows lapses', () => {
    const c = card(2.5, 5, 4, 1);
    const lapse = srsUpdate(c, 0);
    expect(lapse.reps).toBe(0);
    expect(lapse.lapses).toBe(2);
    expect(lapse.interval).toBe(1);
  });
  it('ease stays inside [1.3, 3.0]', () => {
    const c = card(3.0, 7, 6);
    const low = srsUpdate(c, 0);
    expect(low.ease).toBeLessThanOrEqual(3.0);
    const up = srsUpdate(card(1.3, 3, 4), 5);
    expect(up.ease).toBeGreaterThanOrEqual(1.3);
  });
});
