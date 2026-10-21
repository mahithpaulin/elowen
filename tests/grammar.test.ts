import { describe, expect, it } from 'vitest';
import { checkGrammar, baseFormOf, tokenise, coreWord } from '../src/engines/grammar/grammar';
import { COMMON_WORDS } from '../src/engines/grammar/dictionary';
import { suggestSpelling } from '../src/engines/grammar/spelling';

describe('tokenise + coreWord', () => {
  it('keeps offsets pointing at original text', () => {
    const toks = tokenise('My name is.');
    const name = toks[1]!;
    expect(name.text.toLowerCase()).toBe('name');
    expect(name.offset).toBe(3);
    expect(name.offset + name.text.length).toBe(7);
  });
  it('coreWord strips punctuation and lowercases', () => {
    expect(coreWord('Morning,')).toBe('morning');
    expect(coreWord("'tis")).toBe("tis"); // leading apostrophe dropped
  });
});

describe('baseFormOf', () => {
  it('reverses irregular preterites before trying letter-strip rules', () => {
    expect(baseFormOf('went')).toBe('go');
    expect(baseFormOf('took')).toBe('take');
  });
  it('handles regular endings', () => {
    expect(baseFormOf('walked')).toBe('walk');
    expect(baseFormOf('kept')).toBe('keep');
  });
  it('returns null for unknown or base forms', () => {
    expect(baseFormOf('water')).toBeNull();
    expect(baseFormOf('walk')).toBeNull(); // no inflection marker → nothing to reverse
  });
});

describe('checkGrammar — agreement rules', () => {
  it('SVA-001: he goes is fine', () => {
    expect(checkGrammar('he goes to market').issues.filter((i) => i.ruleId === 'SVA-001')).toHaveLength(0);
  });
  it('SVA-001: they is is flagged', () => {
    const issues = checkGrammar('They is my cousins.').issues;
    expect(issues.some((i) => i.ruleId === 'SVA-001' && i.severity === 'error')).toBe(true);
  });
  it('SVA-002: he go … every day flagged as error', () => {
    const issues = checkGrammar('he go to school every day').issues;
    expect(issues.some((i) => i.ruleId === 'SVA-002' && i.severity === 'error')).toBe(true);
  });
});

describe('checkGrammar — do-support (TEN-003/004)', () => {
  it('did not went → flag', () => {
    expect(checkGrammar('I did not went home.').issues.some((i) => i.ruleId === 'TEN-003')).toBe(true);
  });
  it('she has finished stays silent', () => {
    expect(checkGrammar('She has finished her homework.').issues.some((i) => i.ruleId.startsWith('TEN-003'))).toBe(false);
  });
  it('be + base verb flagged', () => {
    expect(checkGrammar('She is write a diary.').issues.some((i) => i.ruleId === 'TEN-004')).toBe(true);
    expect(checkGrammar('She is writing a diary.').issues.some((i) => i.ruleId === 'TEN-004')).toBe(false);
  });
});

describe('checkGrammar — pronoun case (PRN-001)', () => {
  it('between you and I flagged', () => {
    expect(checkGrammar('between you and I it is fine').issues.some((i) => i.ruleId === 'PRN-001')).toBe(true);
  });
  it('from she flagged', () => {
    expect(checkGrammar('i borrowed a pen from she').issues.some((i) => i.ruleId === 'PRN-001')).toBe(true);
  });
});

describe('checkGrammar — time/article & day patterns (ART/PREP)', () => {
  it('wrong day/month preps flagged; correct ones left alone', () => {
    expect(checkGrammar('In Monday we visited the museum.').issues.some((i) => i.ruleId === 'ART-001')).toBe(true);
    expect(checkGrammar('At Monday five am we cook kid.').issues.some((i) => i.ruleId === 'ART-001')).toBe(true);
    expect(checkGrammar('On Monday we visited the museum.').issues.some((i) => i.ruleId.startsWith('ART-'))).toBe(false);
    expect(checkGrammar('Last Monday we visited the museum.').issues).toHaveLength(0);
  });
  it('discuss about flagged (PREP)', () => {
    expect(checkGrammar('i will discuss about the plan').issues.some((i) => i.ruleId.startsWith('PREP-'))).toBe(true);
  });
  it('explain me flagged, explain to me not', () => {
    expect(checkGrammar('Please explain me the sum.').issues.some((i) => i.ruleId.startsWith('PREP-'))).toBe(true);
    expect(checkGrammar('Please explain to me the sum.').issues).toHaveLength(0);
  });
});

describe('checkGrammar — punctuation/capital', () => {
  it('doubled "the the" flagged (PUN-003)', () => {
    expect(checkGrammar('the the results were good').issues.some((i) => i.ruleId === 'PUN-003')).toBe(true);
  });
  it('lowercase i flagged (CAP-002)', () => {
    expect(checkGrammar("yesterday i met him").issues.some((i) => i.ruleId === 'CAP-002')).toBe(true);
  });
  it('missing space flagged (PUN-001)', () => {
    expect(checkGrammar('I went home,and slept.').issues.some((i) => i.ruleId === 'PUN-001')).toBe(true);
  });
});

describe('spelling suggestions', () => {
  it('finds authored misspellings', () => {
    expect(suggestSpelling('recieve')).toBe('receive');
    expect(suggestSpelling('freind')).toBe('friend');
    expect(suggestSpelling('taked')).toBe('took');
  });
  it('drops in-dictionary words as null', () => {
    expect(suggestSpelling('hello')).toBeNull();
  });
});

describe('grammar engine observability', () => {
  it('spelling rule reports exact original token offsets', () => {
    const result = checkGrammar('He teached english last year.');
    const spell = result.issues.find((i) => i.excerpt === 'teached');
    expect(spell).toBeTruthy();
  });
  it('does not flag proper nouns as spelling', () => {
    const result = checkGrammar('Ann bought bread.');
    expect(result.issues.filter((i) => i.ruleId.startsWith('SPL-'))).toHaveLength(0);
  });
});
