import type { GrammarIssue, GrammarResult, IssueSeverity } from '../../types';
import { IRREGULAR_BASES } from './dictionary';
import { likelyMisspelled, MISSPELLINGS, WORD_SET } from './spelling';
import {
  baseFormOf,
  ingFormOf,
  KNOWN_WORDS,
  NON_VERB_AFTER_BE,
  THIRD_SINGULAR_MAP,
} from './verbs';

export { baseFormOf };

export interface Token {
  text: string; // original text, including attached punctuation
  offset: number; // char offset in the original sentence
  word: string; // lowercased core word (surrounding punctuation stripped)
  isWord: boolean;
  sentenceStart: boolean;
}

/* NOTE: brackets are escaped — an unescaped `]` would close the class early. */
const TRIM_CHARS = ".,;:!?…\"'“”‘’()\\[\\]{}\\/";
const TRIM_RE = new RegExp(`^[${TRIM_CHARS}]+|[${TRIM_CHARS}]+$`, 'g');
/* A hyphen inside a word belongs to the word ("well-known"), never a trim. */
const EDGE_HYPHEN_RE = /^-|-$/g;

/**
 * Lowercased core of a token. Hyphens are kept so compound words such as
 * "well-known" stay one word — the previous version trimmed them and turned
 * "well-known" into "wellknown", which the spelling rule then reported as a
 * misspelling.
 */
export function coreWord(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(TRIM_RE, '')
    .replace(EDGE_HYPHEN_RE, '');
}

/** A token is a word when it is letters/digits with internal apostrophes or hyphens. */
const WORD_RE = /^[\p{L}\p{N}]['’]?[\p{L}\p{N}\p{M}]*(-[\p{L}\p{N}\p{M}]+)*$/u;

export function tokenise(text: string): Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let sentenceStart = true;
  for (const raw of text.split(/[\s—–]+/)) {
    if (raw === '') {
      offset += 1;
      continue;
    }
    const idx = text.indexOf(raw, offset);
    offset = idx < 0 ? offset : idx;
    const word = coreWord(raw);
    const isWord = WORD_RE.test(word);
    if (word !== '') {
      tokens.push({ text: raw, offset, word, isWord, sentenceStart });
      sentenceStart = false;
    }
    offset += raw.length;
    if (/[.!?…]['")\]]?$/.test(raw)) sentenceStart = true;
  }
  return tokens;
}

/* ------------------------------------------------------------------ */

const SINGULAR_SUBJECT_PRONOUNS = new Set([
  'he', 'she', 'it', 'this', 'that', 'somebody', 'someone', 'everybody',
  'everyone', 'nobody', 'anybody', 'anyone', 'brother', 'sister', 'father',
  'mother', 'teacher', 'friend', 'uncle', 'aunt', 'cousin', 'boy', 'girl',
  'student', 'doctor', 'manager', 'child', 'parent', 'neighbour', 'neighbor',
  'customer', 'driver', 'man', 'woman', 'lady', 'baby', 'player', 'colleague',
  'classmate', 'engineer', 'visitor', 'son', 'daughter', 'wife', 'husband',
]);
const PLURAL_SUBJECTS = new Set([
  'we', 'they', 'you', 'these', 'those', 'people', 'children', 'friends',
  'parents', 'students', 'teachers', 'players', 'brothers', 'sisters', 'books',
  'words', 'managers', 'customers',
]);
const OBJECT_PRONOUN_MAP: Record<string, string> = {
  i: 'me', he: 'him', she: 'her', we: 'us', they: 'them',
};

/** Words allowed between a preposition and the following connector chain. */
const CONJUNCT_SKIP = new Set([
  'you', 'me', 'him', 'her', 'us', 'them', 'the', 'my', 'our', 'your', 'his',
  'their', 'this', 'that',
]);
const MODALS = new Set([
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  "can't", "won't", "couldn't", "wouldn't", "shouldn't",
]);
const DO_HELPERS = new Set(["didn't", 'doesnt', "doesn't", 'does', 'did', 'do']);
const DAY_NAMES = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
]);
const MONTH_NAMES = new Set([
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
]);
const PARTS_OF_DAY = new Set(['morning', 'afternoon', 'evening']);
const PREP_BEFORE_OBJ = new Set([
  'to', 'with', 'for', 'between', 'after', 'of', 'by', 'above', 'below',
  'under', 'near', 'beside', 'among', 'around', 'against', 'behind', 'beyond',
  'from',
]);
const DETERMINERS = new Set([
  'the', 'a', 'an', 'his', 'her', 'my', 'their', 'our', 'your', 'its', 'this',
  'that', 'these', 'those',
]);
const REPEATED_FUNCTION_WORDS = new Set([
  'the', 'a', 'an', 'to', 'and', 'of', 'in', 'i', 'was', 'he', 'she', 'they',
  'it', 'we', 'for', 'on', 'at', 'do', 'does', 'is', 'are', 'am', 'be', 'been',
  'you', 'will', 'this', 'these', 'those', 'my', 'me', 'him', 'her', 'our',
  'us', 'them', 'but', 'or', 'not', 'no', 'if', 'as', 'than',
  'what', 'when', 'where', 'who', 'why', 'how',
]);
/** Doubled words that are perfectly normal English. */
const LEGITIMATE_DOUBLES = new Set([
  'very', 'so', 'no', 'well', 'yes', 'oh', 'ah', 'ha', 'bye', 'hmm', 'um',
  'who', 'hey', 'wow', 'oops', 'ouch', 'boo', 'gee', 'mhm', 'hush', 'shh',
]);

/* ------------------------------------------------------------------ */

export type RuleFn = (tokens: Token[]) => GrammarIssue[];

function issue(
  ruleId: string,
  severity: IssueSeverity,
  start: number,
  end: number,
  message: string,
  explanation: string,
  suggestion?: string,
): GrammarIssue {
  return { ruleId, severity, start, end, excerpt: '', message, explanation, suggestion };
}

/**
 * True when the token at `i` is part of a compound subject ("my friend and
 * his brother …"). The subject number is then unknowable from the token
 * alone, so agreement rules must stay quiet.
 */
function compoundSubject(tokens: Token[], i: number): boolean {
  if (i <= 0) return false;
  // Step over a determiner so "and his brother" is seen as a compound.
  let j = i - 1;
  while (j >= 0 && DETERMINERS.has(tokens[j]!.word)) j--;
  if (j < 0) return false;
  const prev = tokens[j]!.word;
  return prev === 'and' || prev === 'or' || prev === 'nor';
}

/** S-V copular agreement: he are → is, they is → are, he have → has, … */
const copulaRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1]!,
      cur = tokens[i]!;
    if (!prev.isWord || !cur.isWord) continue;
    if (compoundSubject(tokens, i - 1)) continue; // "my friend and I are" is fine
    const w = cur.word;
    const fix = (want: string): GrammarIssue =>
      issue(
        'SVA-001',
        'error',
        cur.offset,
        cur.offset + cur.text.length,
        `Subject–verb mismatch: “${prev.word} ${w}”.`,
        `With the subject “${prev.word}” the verb should be “${want}”.`,
        want,
      );
    let target: string | null = null;
    if (SINGULAR_SUBJECT_PRONOUNS.has(prev.word)) {
      if (w === 'are') target = 'is';
      else if (w === 'were') target = 'was';
      else if (w === 'have') target = 'has';
    } else if (PLURAL_SUBJECTS.has(prev.word)) {
      if (w === 'is') target = 'are';
      else if (w === 'was') target = 'were';
      else if (w === 'has') target = 'have';
      else if (w === 'am') target = 'are';
    } else if (prev.word === 'i') {
      if (w === 'is') target = 'am';
      else if (w === 'are') target = 'am';
      else if (w === 'were') target = 'was';
      else if (w === 'has') target = 'have';
    }
    if (target && target !== w) out.push(fix(target));
  }
  return out;
};

/** Third-person singular subject + base-form verb: he go → he goes. */
const thirdSingularRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1]!,
      cur = tokens[i]!;
    if (!prev.isWord || !cur.isWord) continue;
    if (!SINGULAR_SUBJECT_PRONOUNS.has(prev.word)) continue;
    if (compoundSubject(tokens, i - 1)) continue;
    const twoBack = i >= 2 ? tokens[i - 2]!.word : '';
    if (twoBack === 'to' || MODALS.has(twoBack) || DO_HELPERS.has(twoBack)) continue;
    const base = cur.word;
    const sform = THIRD_SINGULAR_MAP[base];
    if (!sform) continue;
    out.push(
      issue(
        'SVA-002',
        'error',
        cur.offset,
        cur.offset + cur.text.length,
        `“${prev.word}” takes “${sform}”, not “${base}”.`,
        `In the present tense, verbs after he/she/it take an ending (go → goes, want → wants).`,
        sform,
      ),
    );
  }
  return out;
};

/** did/does/didn't/doesn't must take the base form: “did went” → “did go”. */
const doSupportRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i]!;
    if (!cur.isWord) continue;
    const prev2 = i >= 2 ? tokens[i - 2]!.word : '';
    const prev1 = i >= 1 ? tokens[i - 1]!.word : '';
    const inDoCtx = (prev1 !== '' && DO_HELPERS.has(prev1)) || (prev1 === 'not' && DO_HELPERS.has(prev2));
    if (!inDoCtx) continue;
    const word = cur.word;
    const base = baseFormOf(word);
    if (base == null || base === word) continue;
    out.push(
      issue(
        'TEN-003',
        'error',
        cur.offset,
        cur.offset + cur.text.length,
        `After “did/does”, the base form is needed (“${base}”).`,
        `Auxiliary do/does/did takes the plain base form of the verb: did go. Avoid using the past/particle forms after it.`,
        base,
      ),
    );
  }
  return out;
};

/**
 * be-verb + plain verb: “She is go …” → suggest the present continuous.
 *
 * Two guards keep this quiet where it should be:
 *  - only present-tense be-verbs (am/is/are) are considered;
 *  - words that are normally adjectives or nouns after "is" (open, close,
 *    live, work, ready …) are excluded, so "the shop is open" is not flagged.
 */
const beInfinitiveRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i]!,
      next = tokens[i + 1]!;
    if (!cur.isWord || !next.isWord) continue;
    if (!['am', 'is', 'are'].includes(cur.word)) continue;
    if (NON_VERB_AFTER_BE.has(next.word)) continue;
    if (!THIRD_SINGULAR_MAP[next.word]) continue;
    const ingForm = ingFormOf(next.word);
    if (!ingForm) continue;
    const plain = THIRD_SINGULAR_MAP[next.word]!;
    out.push(
      issue(
        'TEN-004',
        'possible',
        cur.offset,
        next.offset + next.text.length,
        `“${cur.word} ${next.word}” combines a be-verb with a plain present verb.`,
        `Use the present continuous (“${cur.word} ${ingForm}”) for ongoing action, the plain present (“${plain}”) for habits, or “will ${next.word}” for the future.`,
        `${cur.word} ${ingForm}`,
      ),
    );
  }
  return out;
};

/** Preposition takes the object pronoun: with I → with me. */
const pronounCaseRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i]!;
    const prevW = i > 0 ? tokens[i - 1]!.word : '';
    const prev2W = i > 1 ? tokens[i - 2]!.word : '';
    // look left past connectors and a single closed-class skip word:
    // “between you and I”, “for me and you”
    let prepSeen = PREP_BEFORE_OBJ.has(prevW);
    if (!prepSeen && (prevW === 'and' || prevW === 'or')) {
      for (let j = i - 2; j >= i - 4 && j >= 0; j--) {
        const w = tokens[j]!.word;
        if (PREP_BEFORE_OBJ.has(w)) {
          prepSeen = true;
          break;
        }
        if (!CONJUNCT_SKIP.has(w)) break; // only skip authored closed-class words
      }
    }
    if (!prepSeen) continue;
    const wanted = OBJECT_PRONOUN_MAP[cur.word];
    if (!wanted) continue;
    // "to her" is already correct — never tell a learner to change "her".
    if (wanted === cur.word) continue;
    out.push(
      issue(
        'PRN-001',
        'error',
        cur.offset,
        cur.offset + cur.text.length,
        `Use the object form “${wanted}” after “${prevW}”.`,
        `After a preposition (to/with/for/between/by …) English uses object pronouns: me, him, her, us, them.`,
        wanted,
      ),
    );
  }
  return out;
};

/** Articles & time constructions. */
const articleTimeRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i]!,
      next = tokens[i + 1];
    if (!cur.isWord || !next) continue;
    if (!['in', 'on', 'at'].includes(cur.word)) continue;
    if (DAY_NAMES.has(next.word) && cur.word !== 'on') {
      out.push(
        issue(
          'ART-001',
          'error',
          cur.offset,
          cur.offset + cur.text.length,
          `Days take “on ${next.word}”.`,
          `Use “on” for days: on Monday, on Friday.`,
          `on`,
        ),
      );
    } else if (MONTH_NAMES.has(next.word) && cur.word !== 'in') {
      out.push(
        issue(
          'ART-002',
          'error',
          cur.offset,
          cur.offset + cur.text.length,
          `Months take “in ${next.word}”.`,
          `Use “in” for months and years: in January, in 1998.`,
          `in`,
        ),
      );
    } else if (PARTS_OF_DAY.has(next.word)) {
      if (cur.word !== 'in') {
        out.push(
          issue(
            'ART-003',
            'error',
            cur.offset,
            cur.offset + cur.text.length,
            `Use “in the ${next.word}”.`,
            `Say “in the morning / afternoon / evening”, not “at/on ${next.word}”. (“At night” is correct.)`,
            `in the`,
          ),
        );
      } else {
        // “in the morning” needs the article between the preposition and the
        // word: the token after the part of day must be “the”.
        const after = tokens[i + 2];
        if (!after || after.word !== 'the') {
          out.push(
            issue(
              'ART-004',
              'possible',
              cur.offset,
              next.offset + next.text.length,
              `Usually “in the ${next.word}”.`,
              `The article is standard: “in the morning / afternoon / evening”.`,
              `in the ${next.word}`,
            ),
          );
        }
      }
    }
  }
  return out;
};

/** Redundant/misused verb+preposition pairs. */
const verbPrepRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  const span = (i: number, j: number) => ({ start: tokens[i]!.offset, end: tokens[j]!.offset + tokens[j]!.text.length });
  for (let i = 0; i < tokens.length - 1; i++) {
    const cur = tokens[i]!.word,
      next = tokens[i + 1]!.word;
    if (!tokens[i]!.isWord || !tokens[i + 1]!.isWord) continue;
    if (cur === 'discuss' && next === 'about') {
      const s = span(i, i + 1);
      out.push(issue('PREP-001', 'error', s.start, s.end,
        `“discuss about” → “discuss”.`,
        `“Discuss” is transitive: discuss a plan, discuss a question. No “about”.`,
        `discuss`));
    }
    if (cur === 'married' && next === 'with') {
      const s = span(i, i + 1);
      out.push(issue('PREP-003', 'error', s.start, s.end,
        `“married with” → “married to”.`,
        `Use “married to”: She is married to a doctor. (“Got married to …” likewise.)`,
        `married to`));
    }
    if (cur === 'depend' && next === 'of') {
      const s = span(i, i + 1);
      out.push(issue('PREP-004', 'error', s.start, s.end,
        `“depend of” → “depend on”.`,
        `“Depend” pairs with “on”: It depends on the weather.`,
        `depend on`));
    }
    if (cur === 'arrive' && next === 'to') {
      const s = span(i, i + 1);
      out.push(issue('PREP-005', 'possible', s.start, s.end,
        `“arrive to” is usually “arrive at/in”.`,
        `Distinguish arrive at (a point: station) and arrive in (a city/country).`,
        `arrive at`));
    }
    if ((cur === 'return' || cur === 'revert') && next === 'back') {
      const s = span(i, i + 1);
      out.push(issue('PREP-006', 'style', s.start, s.end,
        `“${cur} back” — “back” is redundant.`,
        `“${cur === 'return' ? 'Return' : 'Revert'}” already contains the idea of coming back or answering.`,
        cur));
    }
    const info = tokens[i + 1];
    if (info && DETERMINERS.has(info.word)) {
      const after = tokens[i + 2]?.word ?? '';
      if (cur === 'listen' && after !== 'to') {
        const s = span(i, i + 1);
        out.push(issue('PREP-002', 'error', s.start, s.end,
          `“listen the …” → “listen to the …”.`,
          `“Listen” takes “to”: listen to music, listen to the song.`,
          `listen to`));
      }
    }
    if (['explain', 'describe', 'mention'].includes(cur)) {
      const p = tokens[i + 1];
      if (p && (OBJECT_PRONOUN_MAP[p.word] || ['me', 'him', 'her', 'us', 'them'].includes(p.word))) {
        const s = span(i, i + 1);
        const obj = OBJECT_PRONOUN_MAP[p.word];
        if (obj) {
          // subject form used directly after the verb: explain I → explain to me
          out.push(issue('PREP-008', 'error', s.start, s.end,
            `“${cur} ${p.word}” → “${cur} to ${obj}”.`,
            `Use “to” before the person: explain/mention/describe to me.`,
            `${cur} to ${obj}`));
        } else {
          // object pronoun without the preposition: explain me → explain to me
          out.push(issue('PREP-009', 'error', s.start, s.end,
            `“${cur} ${p.word}” → “${cur} to ${p.word}”.`,
            `The verb takes “to” before a person: explain to me, describe to us.`,
            `${cur} to ${p.word}`));
        }
      }
    }
  }
  return out;
};

/** “the the”, “is is”. */
const doubledWordRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (let i = 1; i < tokens.length; i++) {
    const a = tokens[i - 1]!,
      b = tokens[i]!;
    if (!a.isWord || !b.isWord || a.word !== b.word) continue;
    if (LEGITIMATE_DOUBLES.has(b.word)) continue;
    if (['that', 'had'].includes(b.word)) continue;
    const severity: IssueSeverity = REPEATED_FUNCTION_WORDS.has(b.word) ? 'error' : 'possible';
    out.push(
      issue(
        'PUN-003',
        severity,
        a.offset,
        b.offset + b.text.length,
        `Repeated word: “${b.word} ${b.word}”.`,
        severity === 'error'
          ? 'The same word appears twice in a row.'
          : `"${b.word}" twice in a row — usually a typing slip ("that that" is legal in a few sentences).`,
        b.word,
      ),
    );
  }
  return out;
};

/** Missing space after punctuation in the raw string. */
const ABBREVIATIONS = [
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'vs', 'etc', 'no', 'fig',
  'inc', 'ltd', 'co', 'dept', 'approx', 'est', 'min', 'max', 'e.g', 'i.e',
];

const spacingRule = (text: string): GrammarIssue[] => {
  const out: GrammarIssue[] = [];
  const re = /([,;:!?])([A-Za-z])|([a-z])\.([A-Za-z])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const puncIdx = m[1] !== undefined ? m[1] : undefined;
    // URLs, e-mail addresses and file names are not sentences.
    const lead = text.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
    if (/[@/]|https?:|www\./.test(lead)) continue;
    if (puncIdx !== undefined) {
      const start = m.index;
      out.push(issue('PUN-001', 'error', start, start + 2,
        'Missing space after punctuation.',
        'Add a space after , ; : ! ? to separate sentences and clauses.',
        `${m[1]} ${m[2]}`));
    } else {
      const start = m.index + 1;
      const before = text.slice(Math.max(0, start - 6), start).toLowerCase();
      if (ABBREVIATIONS.some((a) => before.endsWith(a + '.'))) continue;
      out.push(issue('PUN-002', 'error', start, start + 2,
        'Missing space after the full stop.',
        'Put a space after the period before the next sentence starts.',
        `. ${m[4]}`));
    }
  }
  return out;
};

const repeatedPunctRule = (text: string): GrammarIssue[] => {
  const out: GrammarIssue[] = [];
  const re = /([?!.,;]){2,}|(\.\.{2,})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    if (raw === '...' || raw === '…') continue;
    const isDoubleDot = raw.startsWith('..') && raw.length === 2;
    out.push(issue('PUN-005', 'style', m.index, m.index + raw.length,
      `Repeated punctuation “${raw}”.`,
      isDoubleDot
        ? 'Two dots read as an unfinished ellipsis; use one period (or three for an exact ellipsis).'
        : 'Informal punctuation. In formal writing use one mark.',
      raw[0]),
    );
  }
  return out;
};

/** Sentence starts and the pronoun “I”. */
const capitalisationRule = (_text: string, tokens: Token[]): GrammarIssue[] => {
  const out: GrammarIssue[] = [];
  for (const t of tokens) {
    // A one-letter word still starts a sentence: "a cat sat." needs a capital.
    if (t.sentenceStart && /^\p{Ll}/u.test(t.text)) {
      // "i" is handled by CAP-002 below — one finding per problem, not two.
      if (t.word !== 'i') {
        out.push(issue('CAP-001', 'error', t.offset, t.offset + 1,
          'A sentence usually starts with a capital letter.',
          'Capitalize the first word of every sentence.',
          t.text[0]!.toUpperCase()));
      }
    }
    if (t.word === 'i' || t.word.startsWith("i'")) {
      if (/^\p{Ll}/u.test(t.text)) {
        out.push(issue('CAP-002', 'error', t.offset, t.offset + t.text.length,
          'The pronoun “I” is always capitalized.',
          'English capitalizes “I” everywhere: You and I are friends.',
          `I${t.text.slice(1)}`));
      }
    }
  }
  return out;
};

/* ------------------------- spelling ------------------------- */

/**
 * Regular inflections of a known word are not misspellings ("cans" ← "can").
 * An -ed form whose base has an irregular past ("teached" ← "teach") is NOT a
 * regular inflection, so it is still reported.
 */
function isRegularInflection(word: string): boolean {
  if (word.length < 3) return false;
  if (word.endsWith('s')) {
    const stem = word.slice(0, -1);
    return stem.length >= 2 && KNOWN_WORDS.has(stem);
  }
  if (word.length >= 5 && word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    return stem.length >= 2 && KNOWN_WORDS.has(stem);
  }
  if (word.length >= 4 && word.endsWith('ed')) {
    const stem = word.slice(0, -2);
    const short = word.slice(0, -3);
    for (const s of [stem, short]) {
      if (s.length >= 2 && KNOWN_WORDS.has(s) && !IRREGULAR_BASES.has(s)) return true;
    }
    return false;
  }
  return false;
}

const spellingRule: RuleFn = (tokens) => {
  const out: GrammarIssue[] = [];
  for (const t of tokens) {
    if (!t.isWord) continue;

    // curated misspelling table: check regardless of capitals
    const curated = MISSPELLINGS[t.word];
    if (curated) {
      out.push(issue('SPL-001', 'error', t.offset, t.offset + t.text.length,
        `“${t.word}” is a common misspelling.`,
        `The correct spelling is “${curated}”.`,
        curated));
      continue;
    }

    // proper noun / sentence-start guard: any leading capital is skipped
    if (/^\p{Lu}/u.test(t.text)) continue;
    if (/[\p{Lu}]/u.test(t.text.slice(1))) continue;
    // compound words ("well-known") and contractions ("don't") are not in the
    // dictionary — checking them only produced false alarms.
    if (t.word.includes('-')) continue;
    if (t.word.includes("'")) continue;
    if (t.word.endsWith("'s") && WORD_SET.has(t.word.slice(0, -2))) continue;
    if (isRegularInflection(t.word)) continue;
    const alt = likelyMisspelled(t.word);
    if (alt) {
      out.push(issue('SPL-002', 'possible', t.offset, t.offset + t.text.length,
        `“${t.word}” is not in my dictionary.`,
        `Did you mean “${alt}”? If this is a proper noun, ignore.`,
        alt));
    }
  }
  return out;
};

/* ------------------------------------------------------------------ */

const RULES: RuleFn[] = [
  copulaRule,
  thirdSingularRule,
  doSupportRule,
  beInfinitiveRule,
  pronounCaseRule,
  articleTimeRule,
  verbPrepRule,
  doubledWordRule,
  spellingRule,
];

const SEVERITY_ORDER: Record<IssueSeverity, number> = { error: 0, possible: 1, style: 2 };

/** Run all rules; returns issues sorted by position, duplicates removed. */
export function checkGrammar(text: string): GrammarResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { issues: [], tokenCount: 0 };
  const tokens = tokenise(trimmed);
  const issues: GrammarIssue[] = [];
  for (const fn of RULES) {
    try {
      issues.push(...fn(tokens));
    } catch (e) {
      console.error('rule error', e);
    }
  }
  issues.push(...capitalisationRule(trimmed, tokens));
  issues.push(...spacingRule(trimmed));
  issues.push(...repeatedPunctRule(trimmed));
  const seen = new Map<string, GrammarIssue>();
  for (const it of issues) {
    const key = `${it.ruleId}@${it.start}-${it.end}`;
    if (!seen.has(key)) seen.set(key, { ...it, excerpt: trimmed.slice(it.start, it.end) });
  }
  return {
    issues: [...seen.values()].sort(
      (a, b) => a.start - b.start || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    ),
    tokenCount: tokens.length,
  };
}
