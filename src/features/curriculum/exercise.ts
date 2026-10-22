import type { Exercise } from '../../types';
import { hashString, normaliseText, shuffle } from '../../utils';

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

/**
 * How a multiple-choice question is laid out on screen.
 *
 * The authored lesson data has the correct answer at index 0 in every single
 * question, so the old UI made "always pick the first option" a winning
 * strategy. The options are shuffled here with a deterministic seed: the same
 * lesson and attempt always look the same, but the answer is spread over the
 * positions and a retry reshuffles it.
 */
export function mcqPresentation(
  ex: Extract<Exercise, { type: 'mcq' }>,
  seed: number,
): { options: string[]; answerIndex: number; order: number[] } {
  const order = shuffle(ex.options.map((_, i) => i), seed);
  return {
    options: order.map((i) => ex.options[i]!),
    answerIndex: order.indexOf(ex.answerIndex),
    // Presented position → original option index. Checking an answer has to
    // map the tap back through this, otherwise every shuffled question is
    // marked wrong unless the correct option happened to land first.
    order,
  };
}

/**
 * Deterministic tile order (seeded shuffle).
 * The seed mixes in the exercise words so two exercises with the same words
 * do not come out in the same order.
 */
export function tileOrder(ex: Extract<Exercise, { type: 'wordOrder' }>, salt = 0): string[] {
  return shuffle(ex.words, hashString(`${ex.words.join('|')}#${salt}`));
}
