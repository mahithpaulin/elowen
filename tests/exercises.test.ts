import { describe, expect, it } from 'vitest';
import { checkAnswer, tileOrder } from '../src/features/curriculum/exercise';

const mcq = {
  type: 'mcq' as const,
  prompt: 'Choose',
  options: ['a', 'b', 'c'],
  answerIndex: 1,
  explanation: 'b is correct',
};

const type = {
  type: 'type' as const,
  prompt: 'Fill',
  accept: ['It is seven o’clock', 'it is seven o clock'],
  hint: 'time',
  explanation: 'x',
};

const order = {
  type: 'wordOrder' as const,
  prompt: 'Assemble',
  words: ['she', 'is', 'singing'],
  answer: 'she is singing',
  explanation: 'x',
};

describe('checkAnswer', () => {
  it('mcq indexes strictly', () => {
    expect(checkAnswer(mcq, 0).correct).toBe(false);
    expect(checkAnswer(mcq, 1).correct).toBe(true);
  });
  it('type normalises spacing and case', () => {
    expect(checkAnswer(type, '  it is   seven O’clock ').correct).toBe(true);
  });
  it('wordOrder assembled string matches', () => {
    expect(checkAnswer(order, 'she is singing').correct).toBe(true);
    expect(checkAnswer(order, 'is singing she').correct).toBe(false);
  });
  it('wrong answers carry a note', () => {
    expect(checkAnswer(order, 'wrong').note).toBeTruthy();
  });
});

describe('tileOrder', () => {
  it('is deterministic — same tiles, same order', () => {
    const a = tileOrder(order);
    const b = tileOrder(order);
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([...order.words].sort());
  });
});
