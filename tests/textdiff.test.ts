import { describe, expect, it } from 'vitest';
import { compareReference, alignTokens, tokenise, stripSurroundingPunct } from '../src/engines/textdiff';

describe('tokenise', () => {
  it('splits on whitespace and punctuation', () => {
    expect(tokenise('Good morning, my friend.')).toEqual(['good', 'morning', 'my', 'friend']);
  });
  it('keeps apostrophes inside words', () => {
    expect(tokenise("It's Ann's book")).toEqual(["it's", "ann's", 'book']);
  });
});

describe('stripSurroundingPunct', () => {
  it('removes punctuation', () => {
    expect(stripSurroundingPunct('"hello,"!')).toBe('hello');
  });
});

describe('alignTokens', () => {
  it('marks all matched tokens', () => {
    const align = alignTokens(['good', 'morning'], ['good', 'morning']);
    expect(align.every((t) => t.kind === 'match')).toBe(true);
  });
  it('marks a substitution', () => {
    const align = alignTokens(['good', 'day'], ['good', 'morning']);
    const kinds = align.map((t) => t.kind).sort();
    expect(kinds).toEqual(['match', 'sub']);
  });
  it('marks deletions when reference is longer', () => {
    const align = alignTokens(['we', 'were', 'good'], ['we']);
    expect(align.filter((t) => t.kind === 'del').map((t) => t.reference)).toEqual(['were', 'good']);
  });
  it('marks insertions when produced has extras', () => {
    const align = alignTokens(['hi'], ['hey', 'hi']);
    expect(align.filter((t) => t.kind === 'ins').map((t) => t.produced!)).toEqual(['hey']);
  });
});

describe('compareReference', () => {
  it('scores a perfect read as 1', () => {
    expect(compareReference('the market opens at six', 'The market opens at six.').similarity).toBe(1);
  });
  it('scores a partial read proportionally', () => {
    const result = compareReference('one two three four', 'one two');
    expect(result.similarity).toBeCloseTo(2 / 4);
  });
  it('treats produced-only words as inserts without hurting match count of the sentence skeleton', () => {
    const result = compareReference('the city', 'the the city');
    expect(result.similarity).toBe(1);
  });
  it('empty produced scores 0', () => {
    expect(compareReference('some words', '').similarity).toBe(0);
  });
});
