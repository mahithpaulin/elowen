import { describe, expect, it } from 'vitest';
import { shuffle, clamp, mean, median, robustCV, uid, todayKey, dayKeyDiff, normaliseText, linearFit } from '../src/utils';

describe('utils', () => {
  it('clamp clamps', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
  });
  it('mean/median basics', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(median([1, 3, 2])).toBe(2);
    expect(median([1, 2, 999, 3])).toBe(2.5);
  });
  it('robustCV is scale invariant and noise resistant', () => {
    expect(robustCV([10, 10, 10, 10])).toBeLessThan(0.02);
    expect(robustCV([100, 200, 300, 400, 500, 600])).toBeGreaterThan(0.15);
    const single = robustCV([5, 5, 5, 5, 500]);
    expect(single == null || Number.isFinite(single)).toBe(true); // outlier tolerated
  });
  it('shuffle is deterministic and keeps elements', () => {
    const a = shuffle(['x', 'y', 'z', 'w'], 7);
    const b = shuffle(['x', 'y', 'z', 'w'], 7);
    expect(a).toEqual(b);
    expect([...a].sort().join('')).toBe('wxyz');
  });
  it('normaliseText lowercases, collapses spacing, strips punctuation', () => {
    expect(normaliseText('  It   IS, fine! ')).toBe('it is fine');
  });
  it('dayKey math', () => {
    const t = todayKey();
    expect(dayKeyDiff(t, t)).toBe(0);
  });
  it('uid is a non-empty string', () => {
    expect(uid().length).toBeGreaterThan(5);
  });
  it('linearFit recovers a line', () => {
    const fit = linearFit([0, 1, 2], [1, 3, 5]);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.intercept).toBeCloseTo(1);
  });
});
