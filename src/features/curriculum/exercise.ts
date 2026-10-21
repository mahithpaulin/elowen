import type { Exercise } from '../../types';
import { normaliseText, shuffle } from '../../utils';

/**
 * Answer checking — deterministic, normalised:
 *  - mcq: index equality
 *  - type: normalised text against the accepted list
 *  - wordOrder: normalised assembled order against the answer string
 */
export function checkAnswer(ex: Exercise, response: unknown): { correct: boolean; note?: string } {
  if (ex.type === 'mcq') {
    return { correct: response === ex.answerIndex };
  }
  const given = normaliseText(String(response ?? ''));
  const correct =
    ex.type === 'type'
      ? ex.accept.some((a) => normaliseText(a) === given)
      : normaliseText(ex.answer) === given;
  return {
    correct,
    note: correct ? undefined : 'Check the pattern once more — the tip below explains why.',
  };
}

/** Deterministic tile order (seeded shuffle). */
export function tileOrder(ex: Extract<Exercise, { type: 'wordOrder' }>): string[] {
  return shuffle(ex.words, 17 + ex.words.length);
}
