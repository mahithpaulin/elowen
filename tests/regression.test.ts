/**
 * Regression tests for the 2026-10-21 repair pass.
 *
 * Every test here corresponds to a bug that shipped and was fixed. They are
 * written so that re-introducing the bug fails the build.
 */

import { describe, expect, it } from 'vitest';
import { checkGrammar, baseFormOf, tokenise, coreWord } from '../src/engines/grammar/grammar';
import { ingFormOf } from '../src/engines/grammar/verbs';
import { suggestSpelling } from '../src/engines/grammar/spelling';
import { compareReference } from '../src/engines/textdiff';
import { contrastStretch, adaptiveThreshold, labelComponents } from '../src/engines/imageproc/imageproc';
import { measure } from '../src/engines/imageproc/analyze';
import { vad, describeActivity, resample, ASR_SAMPLE_RATE } from '../src/engines/audio/audio';
import { topicAccuracy } from '../src/engines/scoring/scoring';
import { shuffle, normaliseText, hashString } from '../src/utils';
import { mcqPresentation, tileOrder, checkAnswer } from '../src/features/curriculum/exercise';
import { UNITS, INTERMEDIATE_UNITS } from '../src/data/curriculum/units';
import { PASSAGES } from '../src/data/reading/passages';
import { splitSentences, nextLessonTarget } from '../src/storage/appstore';
import { parseLessonTarget } from '../src/pages/helpers';
import { decodeJwtPayload } from '../src/app/googleAuth';
import type { ActivityEvent, LessonProgress } from '../src/types';

const allUnits = [...UNITS, ...INTERMEDIATE_UNITS];
const allMcq = allUnits.flatMap((u) =>
  u.lessons.flatMap((l) => l.exercises.filter((e) => e.type === 'mcq')),
);
const passageMcq = PASSAGES.flatMap((p) => p.questions.filter((q) => q.type === 'mcq'));

/* ------------------------------------------------------------------ */
/* Multiple choice must not be a giveaway                                */
/* ------------------------------------------------------------------ */

describe('multiple choice layout', () => {
  it('every authored question has the answer first (the old data bug)', () => {
    // If this ever stops being true the data itself changed; the shuffle test
    // below is what actually protects the learner.
    expect(allMcq.length).toBeGreaterThan(30);
    expect(allMcq.every((e) => e.type === 'mcq' && e.answerIndex === 0)).toBe(true);
  });

  it('shuffling spreads the correct answer over all positions', () => {
    const counts = [0, 0, 0, 0];
    for (const ex of allMcq) {
      if (ex.type !== 'mcq') continue;
      const p = mcqPresentation(ex, hashString(`${ex.prompt}#0`));
      counts[p.answerIndex] = (counts[p.answerIndex] ?? 0) + 1;
    }
    // No position may hold more than half of the questions.
    for (const c of counts) expect(c).toBeLessThan(allMcq.length / 2);
    // And every position must be used at all.
    for (const c of counts) expect(c).toBeGreaterThan(0);
  });

  it('the same seed gives the same layout, a different seed does not', () => {
    const ex = allMcq[0]!;
    if (ex.type !== 'mcq') throw new Error('expected an mcq');
    const a = mcqPresentation(ex, 7);
    const b = mcqPresentation(ex, 7);
    const c = mcqPresentation(ex, 8);
    expect(a).toEqual(b);
    expect(a.options.slice().sort()).toEqual(c.options.slice().sort());
  });

  it('reading questions are shuffled as well', () => {
    for (const q of passageMcq) {
      if (q.type !== 'mcq') continue;
      const p = mcqPresentation(q, hashString(q.prompt));
      expect(p.options[p.answerIndex]).toBe(q.options[q.answerIndex]);
    }
  });

  it('a tap on the shuffled correct option is marked correct', () => {
    // The UI used to pass the *presented* index to checkAnswer, which compares
    // against the original answer index. Since every authored answer is index
    // 0, any shuffled question was marked wrong unless the answer landed first.
    for (const ex of [...allMcq, ...passageMcq]) {
      if (ex.type !== 'mcq') continue;
      const p = mcqPresentation(ex, hashString(`${ex.prompt}#0`));
      expect(p.order.slice().sort((a, b) => a - b)).toEqual(ex.options.map((_, i) => i));
      for (let presented = 0; presented < p.options.length; presented++) {
        const verdict = checkAnswer(ex, p.order[presented]);
        expect(verdict.correct).toBe(presented === p.answerIndex);
        expect(p.options[p.answerIndex]).toBe(ex.options[ex.answerIndex]);
      }
    }
  });
});

/* ------------------------------------------------------------------ */
/* Grammar: verb morphology                                              */
/* ------------------------------------------------------------------ */

describe('verb morphology', () => {
  it('does not invent base forms by chopping letters', () => {
    // "did need" used to be corrected to "did ne".
    expect(baseFormOf('need')).toBeNull();
    expect(baseFormOf('indeed')).toBeNull();
    expect(baseFormOf('water')).toBeNull();
  });

  it('finds the real base of regular and irregular pasts', () => {
    expect(baseFormOf('walked')).toBe('walk');
    expect(baseFormOf('stopped')).toBe('stop');
    expect(baseFormOf('liked')).toBe('like');
    expect(baseFormOf('arrived')).toBe('arrive');
    expect(baseFormOf('died')).toBe('die');
    expect(baseFormOf('tried')).toBe('try');
    expect(baseFormOf('went')).toBe('go');
    expect(baseFormOf('goes')).toBe('go');
  });

  it('builds present continuous forms correctly', () => {
    expect(ingFormOf('come')).toBe('coming');
    expect(ingFormOf('run')).toBe('running');
    expect(ingFormOf('make')).toBe('making');
    expect(ingFormOf('study')).toBe('studying');
    expect(ingFormOf('lie')).toBe('lying');
    expect(ingFormOf('sit')).toBe('sitting');
    expect(ingFormOf('write')).toBe('writing');
  });

  it('flags "did not went" but leaves "did need" alone', () => {
    expect(checkGrammar('I did not went home.').issues.some((i) => i.ruleId === 'TEN-003')).toBe(true);
    expect(checkGrammar('I did need help.').issues.some((i) => i.ruleId === 'TEN-003')).toBe(false);
  });

  it('suggests "is running", never "is runing"', () => {
    const issues = checkGrammar('She is run to school.').issues;
    const t = issues.find((i) => i.ruleId === 'TEN-004');
    expect(t).toBeTruthy();
    expect(t!.suggestion).toBe('is running');
  });

  it('does not read an adjective as a bare verb', () => {
    expect(checkGrammar('The shop is open today.').issues.some((i) => i.ruleId === 'TEN-004')).toBe(false);
    expect(checkGrammar('The work is hard.').issues.some((i) => i.ruleId === 'TEN-004')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Grammar: false positives that used to fire                           */
/* ------------------------------------------------------------------ */

describe('grammar false positives', () => {
  it('leaves an object pronoun alone after a preposition', () => {
    expect(checkGrammar('Send it to her before Friday.').issues.some((i) => i.ruleId === 'PRN-001')).toBe(false);
    expect(checkGrammar('Give it to him now.').issues.some((i) => i.ruleId === 'PRN-001')).toBe(false);
  });

  it('does not guess the number of a compound subject', () => {
    expect(checkGrammar('My friend and I are ready.').issues.some((i) => i.ruleId === 'SVA-001')).toBe(false);
    expect(checkGrammar('My teacher and his brother go home.').issues.some((i) => i.ruleId === 'SVA-002')).toBe(false);
  });

  it('flags a one-letter sentence start', () => {
    expect(checkGrammar('a cat sat on the mat.').issues.some((i) => i.ruleId === 'CAP-001')).toBe(true);
  });

  it('does not flag legitimate doubled words', () => {
    expect(checkGrammar('This is very very good.').issues.some((i) => i.ruleId === 'PUN-003')).toBe(false);
  });

  it('keeps compound words and contractions out of the spelling check', () => {
    expect(checkGrammar('It is a well-known fact.').issues.some((i) => i.ruleId.startsWith('SPL-'))).toBe(false);
    expect(checkGrammar("I don't think so.").issues.some((i) => i.ruleId.startsWith('SPL-'))).toBe(false);
  });

  it('does not suggest a different word for a regular plural', () => {
    expect(checkGrammar('Two cans of water.').issues.some((i) => i.ruleId === 'SPL-002')).toBe(false);
  });

  it('still reports a real irregular-past error', () => {
    const issues = checkGrammar('He teached english last year.').issues;
    expect(issues.some((i) => i.ruleId.startsWith('SPL-'))).toBe(true);
    expect(issues.find((i) => i.ruleId.startsWith('SPL-'))!.suggestion).toBe('taught');
  });
});

/* ------------------------------------------------------------------ */
/* Grammar: suggestions must be usable                                   */
/* ------------------------------------------------------------------ */

describe('grammar suggestions', () => {
  it('a suggestion replaces the highlighted span and keeps the rest', () => {
    const text = 'Please explain me this plan.';
    const issue = checkGrammar(text).issues.find((i) => i.ruleId === 'PREP-009');
    expect(issue).toBeTruthy();
    const fixed = text.slice(0, issue!.start) + issue!.suggestion + text.slice(issue!.end);
    expect(fixed).toBe('Please explain to me this plan.');
  });

  it('"married with" becomes "married to"', () => {
    const text = 'She is married with a doctor.';
    const issue = checkGrammar(text).issues.find((i) => i.ruleId === 'PREP-003');
    expect(issue).toBeTruthy();
    const fixed = text.slice(0, issue!.start) + issue!.suggestion + text.slice(issue!.end);
    expect(fixed).toBe('She is married to a doctor.');
  });

  it('a missing space after a full stop keeps the next letter', () => {
    const text = 'He went home.Then he slept.';
    const issue = checkGrammar(text).issues.find((i) => i.ruleId === 'PUN-002');
    expect(issue).toBeTruthy();
    const fixed = text.slice(0, issue!.start) + issue!.suggestion + text.slice(issue!.end);
    expect(fixed).toBe('He went home. Then he slept.');
  });

  it('"in morning" asks for the article', () => {
    expect(checkGrammar('I go there in morning.').issues.some((i) => i.ruleId === 'ART-004')).toBe(true);
    expect(checkGrammar('I go there in the morning.').issues.some((i) => i.ruleId === 'ART-004')).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Tokenising                                                           */
/* ------------------------------------------------------------------ */

describe('tokenising', () => {
  it('keeps a hyphen inside a word', () => {
    expect(coreWord('well-known')).toBe('well-known');
    expect(tokenise('a well-known fact')[1]!.word).toBe('well-known');
  });

  it('still trims trailing punctuation', () => {
    expect(coreWord('Morning,')).toBe('morning');
  });
});

/* ------------------------------------------------------------------ */
/* Image processing                                                     */
/* ------------------------------------------------------------------ */

describe('image processing', () => {
  const W = 120;
  const H = 60;
  const paper = () => {
    const data = new Uint8Array(W * H).fill(250);
    for (let y = 10; y < 50; y++) for (let x = 10; x < 110; x++) data[y * W + x] = 15;
    return { w: W, h: H, data };
  };

  it('contrast stretch keeps the darkest pixels dark', () => {
    // A negative value written into a Uint8Array wraps to 255, which used to
    // turn the ink of the page white before thresholding.
    const g = paper();
    const out = contrastStretch(g);
    expect(Math.min(...out.data)).toBeLessThan(40);
    expect(Math.max(...out.data)).toBeGreaterThan(200);
  });

  it('the ink survives the full pipeline as ink', () => {
    const g = paper();
    const bin = adaptiveThreshold(contrastStretch(g));
    expect(bin.data.some((v) => v === 1)).toBe(true);
    expect(bin.data.filter((v) => v === 1).length).toBeGreaterThan(100);
  });

  it('slant of a vertical stroke is near zero, a horizontal bar is ignored', () => {
    // One vertical bar and one horizontal bar, drawn separately.
    const vertical = { w: 40, h: 40, data: new Uint8Array(40 * 40).fill(255) };
    for (let y = 5; y < 35; y++) for (let x = 19; x < 22; x++) vertical.data[y * 40 + x] = 0;
    const binV = adaptiveThreshold(contrastStretch(vertical));
    const resV = measure(binV);
    expect(resV.slantDeg == null || Math.abs(resV.slantDeg) < 20).toBe(true);

    const horizontal = { w: 40, h: 40, data: new Uint8Array(40 * 40).fill(255) };
    for (let y = 19; y < 22; y++) for (let x = 5; x < 35; x++) horizontal.data[y * 40 + x] = 0;
    const binH = adaptiveThreshold(contrastStretch(horizontal));
    const resH = measure(binH);
    // A horizontal bar is not a letter: it must not report a 90° slant.
    expect(resH.slantDeg == null || Math.abs(resH.slantDeg) < 45).toBe(true);
  });

  it('connected components are still found', () => {
    const bin = adaptiveThreshold(contrastStretch(paper()));
    expect(labelComponents(bin)).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Audio                                                                */
/* ------------------------------------------------------------------ */

describe('audio activity', () => {
  const SR = 16000;
  const speechBursts = (seconds: number, lead: number) => {
    const n = Math.round(seconds * SR);
    const out = new Float32Array(n);
    // 0.4 s of voice, then 0.4 s of silence — a pause long enough to count.
    for (let i = Math.round(lead * SR); i < n; i++) {
      out[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / SR) * (i % (0.8 * SR) < 0.4 * SR ? 1 : 0);
    }
    return out;
  };

  it('the silence before the first word is not a pause', () => {
    const samples = speechBursts(2, 1.2);
    const act = describeActivity(vad(samples, SR), samples, SR);
    expect(act.pauseCount).toBe(0);
  });

  it('a real gap between two phrases is a pause', () => {
    const samples = speechBursts(2.4, 0);
    const act = describeActivity(vad(samples, SR), samples, SR);
    expect(act.pauseCount).toBeGreaterThan(0);
  });
});

describe('resampling', () => {
  it('keeps a 1 kHz tone at 1 kHz when downsampling to 16 kHz', () => {
    const from = 48000;
    const n = from; // one second
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 1000 * i) / from);
    const y = resample(x, from, ASR_SAMPLE_RATE);
    expect(y.length).toBe(ASR_SAMPLE_RATE);
    // Count zero crossings to recover the frequency of the resampled signal.
    let crossings = 0;
    for (let i = 1; i < y.length; i++) {
      if ((y[i - 1]! < 0 && y[i]! >= 0) || (y[i - 1]! >= 0 && y[i]! < 0)) crossings++;
    }
    const freq = crossings / 2;
    expect(freq).toBeGreaterThan(950);
    expect(freq).toBeLessThan(1050);
  });

  it('removes energy above the new Nyquist limit instead of aliasing it', () => {
    const from = 48000;
    const n = from;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 20000 * i) / from);
    const y = resample(x, from, ASR_SAMPLE_RATE);
    let peak = 0;
    for (const v of y) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeLessThan(0.2);
  });

  it('is a no-op when the rates match', () => {
    const x = new Float32Array([0.1, 0.2, 0.3]);
    expect(resample(x, 16000, 16000)).toBe(x);
  });
});

/* ------------------------------------------------------------------ */
/* Scoring                                                              */
/* ------------------------------------------------------------------ */

describe('topic accuracy window', () => {
  const ev = (day: number, score: number, topic = 'tenses'): ActivityEvent => ({
    id: `e${day}-${score}`,
    ts: Date.now() - day * 86400000,
    kind: 'lesson',
    topic,
    score,
    xp: 10,
  });

  it('averages the most recent ten and counts them separately', () => {
    const events = Array.from({ length: 14 }, (_, i) => ev(14 - i, i < 4 ? 10 : 100));
    const [t] = topicAccuracy(events);
    expect(t!.attempts).toBe(10);
    expect(t!.total).toBe(14);
    expect(t!.avg).toBeCloseTo(100);
  });
});

/* ------------------------------------------------------------------ */
/* Utilities                                                            */
/* ------------------------------------------------------------------ */

describe('shuffle quality', () => {
  it('is deterministic for a seed and different across seeds', () => {
    const xs = Array.from({ length: 12 }, (_, i) => i);
    expect(shuffle(xs, 7)).toEqual(shuffle(xs, 7));
    expect(shuffle(xs, 7)).not.toEqual(shuffle(xs, 8));
  });

  it('does not keep the first element in place more often than chance', () => {
    const xs = Array.from({ length: 10 }, (_, i) => i);
    let firstStayed = 0;
    for (let seed = 0; seed < 200; seed++) {
      if (shuffle(xs, seed)[0] === 0) firstStayed++;
    }
    // A biased LCG would pin the first element far more often than 10%.
    expect(firstStayed).toBeLessThan(50);
  });

  it('produces a different order for most seeds', () => {
    const xs = Array.from({ length: 8 }, (_, i) => i);
    const orders = new Set<string>();
    for (let seed = 0; seed < 40; seed++) orders.add(shuffle(xs, seed).join(','));
    expect(orders.size).toBeGreaterThan(20);
  });
});

describe('answer normalisation', () => {
  it('keeps the apostrophe in a contraction', () => {
    expect(normaliseText("don't")).toBe("don't");
    expect(normaliseText('It IS, fine!')).toBe('it is fine');
  });

  it('accepts a contraction answer written with an apostrophe', () => {
    const ex = { type: 'type' as const, prompt: 'x', accept: ["doesn't"], explanation: '' };
    expect(checkAnswer(ex, "doesn't").correct).toBe(true);
    expect(checkAnswer(ex, 'does not').correct).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Word order                                                           */
/* ------------------------------------------------------------------ */

describe('word order tiles', () => {
  const ex = { type: 'wordOrder' as const, prompt: 'x', words: ['a', 'brown', 'small', 'dog'], answer: 'a small brown dog', explanation: '' };

  it('is deterministic and keeps every word', () => {
    const a = tileOrder(ex, 3);
    expect(a).toEqual(tileOrder(ex, 3));
    expect([...a].sort()).toEqual([...ex.words].sort());
  });

  it('does not reuse the previous exercise order for a new exercise', () => {
    const other = { ...ex, words: ['yesterday', 'I', 'visited', 'my grandmother'] };
    expect(tileOrder(other, 0)).not.toEqual(tileOrder(ex, 0));
  });
});

/* ------------------------------------------------------------------ */
/* Sentences & demo data                                                */
/* ------------------------------------------------------------------ */

describe('sentence splitting', () => {
  it('splits on terminal punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
    expect(splitSentences('  ')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Lesson targets                                                       */
/* ------------------------------------------------------------------ */

describe('lesson targets', () => {
  it('splits "unitId/lessonId" into two parts, never shifting them', () => {
    expect(parseLessonTarget('u1/l1')).toEqual({ unitId: 'u1', lessonId: 'l1' });
    expect(parseLessonTarget('l1')).toBeNull();
    expect(parseLessonTarget('u1/')).toBeNull();
    expect(parseLessonTarget('/l1')).toBeNull();
    expect(parseLessonTarget('u1/l1/extra')).toBeNull();
  });

  it('every next-lesson target resolves to a real unit and lesson', () => {
    const done: LessonProgress[] = [];
    for (const unit of allUnits) {
      for (const lesson of unit.lessons) {
        const target = nextLessonTarget([], done);
        expect(target).toBe(`${unit.id}/${lesson.id}`);
        const parts = parseLessonTarget(target!);
        expect(parts).toEqual({ unitId: unit.id, lessonId: lesson.id });
        expect(allUnits.find((u) => u.id === parts!.unitId)).toBeDefined();
        expect(unit.lessons.find((l) => l.id === parts!.lessonId)).toBeDefined();
        done.push({ lessonId: lesson.id, attempts: 1, best: 80, lastTs: Date.now() });
      }
    }
    expect(nextLessonTarget([], done)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Google JWT decoding                                                  */
/* ------------------------------------------------------------------ */

function fakeJwt(payload: Record<string, unknown>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  const b64 = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `eyJhbGciOiJSUzI1NiJ9.${b64}.signature`;
}

describe('Google profile decoding', () => {
  it('keeps non-Latin names intact', () => {
    const p = decodeJwtPayload(
      fakeJwt({ sub: '123', name: 'മഹിത് José', email: 'a@b.c', picture: 'https://x/y.png' }),
    );
    expect(p).toEqual({
      sub: '123',
      name: 'മഹിത് José',
      email: 'a@b.c',
      picture: 'https://x/y.png',
    });
  });

  it('rejects a token without a subject', () => {
    expect(decodeJwtPayload(fakeJwt({ name: 'No sub' }))).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});
