/**
 * Verb morphology for the rule engine.
 *
 * Everything here is deterministic and table-driven. The design rule that
 * matters: **a base form is only ever proposed when we are confident it is a
 * real word.** The old implementation guessed by chopping letters off
 * ("need" → "ne", "died" → "dy", "tied" → "ty"), which produced nonsense
 * suggestions in the Grammar Lab. Now every candidate must be a known word
 * before it is offered, and otherwise the rule stays silent.
 */

import { COMMON_WORDS, IRREGULAR_PAST_REVERSE } from './dictionary';

/** base → third-person singular. */
export const THIRD_SINGULAR_MAP: Record<string, string> = {
  go: 'goes', come: 'comes', make: 'makes', take: 'takes', give: 'gives',
  know: 'knows', say: 'says', think: 'thinks', want: 'wants', like: 'likes',
  need: 'needs', look: 'looks', work: 'works', play: 'plays', help: 'helps',
  read: 'reads', write: 'writes', speak: 'speaks', learn: 'learns', stay: 'stays',
  stop: 'stops', sit: 'sits', run: 'runs', eat: 'eats', drink: 'drinks',
  sleep: 'sleeps', watch: 'watches', wash: 'washes', teach: 'teaches',
  study: 'studies', carry: 'carries', buy: 'buys', send: 'sends', tell: 'tells',
  ask: 'asks', answer: 'answers', open: 'opens', start: 'starts', meet: 'meets',
  listen: 'listens', hope: 'hopes', kiss: 'kisses', catch: 'catches',
  finish: 'finishes', live: 'lives', love: 'loves', hate: 'hates', show: 'shows',
  mean: 'means', feel: 'feels', find: 'finds', understand: 'understands',
  bring: 'brings', try: 'tries', pass: 'passes', use: 'uses', walk: 'walks',
  talk: 'talks', call: 'calls', sing: 'sings', win: 'wins', lose: 'loses',
  wait: 'waits', drive: 'drives', grow: 'grows', sell: 'sells', spend: 'spends',
  cost: 'costs', fly: 'flies', cut: 'cuts', draw: 'draws', pay: 'pays',
  visit: 'visits', enjoy: 'enjoys', agree: 'agrees', arrive: 'arrives',
  believe: 'believes', belong: 'belongs', cook: 'cooks', dance: 'dances',
  decide: 'decides', explain: 'explains', jump: 'jumps', laugh: 'laughs',
  borrow: 'borrows', build: 'builds', clean: 'cleans', close: 'closes', cry: 'cries',
  wear: 'wears', wake: 'wakes', smile: 'smiles', sound: 'sounds',
};

/** third-person singular → base. */
export const THIRD_SINGULAR_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(THIRD_SINGULAR_MAP).map(([base, s]) => [s, base]),
);

/**
 * Past participles whose base is not recoverable from the simple past.
 * ("written" → write, "eaten" → eat, "given" → give …)
 */
export const IRREGULAR_PARTICIPLE: Record<string, string> = {
  written: 'write', spoken: 'speak', eaten: 'eat', given: 'give', taken: 'take',
  driven: 'drive', chosen: 'choose', forgotten: 'forget', hidden: 'hide',
  risen: 'rise', fallen: 'fall', broken: 'break', stolen: 'steal', worn: 'wear',
  torn: 'tear', born: 'bear', drawn: 'draw', shown: 'show', thrown: 'throw',
  grown: 'grow', known: 'know', seen: 'see', been: 'be', done: 'do', gone: 'go',
  begun: 'begin', sung: 'sing', sunk: 'sink', drunk: 'drink', struck: 'strike',
  woven: 'weave', flown: 'fly', blown: 'blow', swum: 'swim', shot: 'shoot',
  led: 'lead', burnt: 'burn', learnt: 'learn', spelt: 'spell', dreamt: 'dream',
  leaned: 'lean', leapt: 'leap', hid: 'hide', slid: 'slide', spun: 'spin',
};

/**
 * Words that end in -ed / -ing but are NOT inflected forms. Without this list
 * "did need" could be "corrected" to "did ne".
 */
export const NEVER_INFLECT: Set<string> = new Set([
  'indeed', 'need', 'feed', 'seed', 'speed', 'breed', 'bleed', 'weed', 'creed',
  'deed', 'heed', 'greed', 'shed', 'sled', 'wed', 'embed', 'exceed', 'proceed',
  'succeed', 'bed', 'red', 'led', 'fled', 'ted', 'red',
]);

/** Every word the engine is willing to call a "base form". */
export const KNOWN_WORDS: Set<string> = new Set([
  ...COMMON_WORDS,
  ...Object.keys(THIRD_SINGULAR_MAP),
  ...Object.values(THIRD_SINGULAR_MAP),
  ...Object.values(IRREGULAR_PAST_REVERSE),
  ...Object.values(IRREGULAR_PARTICIPLE),
  'lie', 'die', 'try', 'cry', 'carry', 'study', 'apply', 'reply', 'deny',
  'worry', 'hurry', 'play', 'walk', 'like', 'hope', 'love', 'live', 'move',
  'believe', 'arrive', 'agree', 'use', 'come', 'make', 'take', 'write',
  'read', 'speak', 'learn', 'teach', 'help', 'call', 'ask', 'answer', 'start',
  'open', 'close', 'watch', 'wash', 'finish', 'catch', 'kiss', 'drop', 'stop',
  'plan', 'visit', 'cook', 'dance', 'decide', 'explain', 'jump', 'laugh',
  'borrow', 'build', 'clean', 'cry', 'wear', 'wake', 'smile', 'sound', 'run',
  'sit', 'swim', 'travel', 'begin', 'stand', 'ride', 'agree', 'decide',
  'jump', 'cook', 'kiss', 'die', 'be', 'do', 'go', 'see', 'say', 'get',
]);

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const isVowel = (c: string): boolean => VOWELS.has(c);
const isConsonant = (c: string): boolean => !!c && !isVowel(c) && /[a-z]/.test(c);

/** CVC stem that takes a silent "e" (lik → like, hop → hope). */
function takesSilentE(stem: string): boolean {
  if (stem.length < 3) return false;
  const a = stem[stem.length - 3]!;
  const b = stem[stem.length - 2]!;
  const c = stem[stem.length - 1]!;
  if (!isConsonant(a) || !isVowel(b) || !isConsonant(c)) return false;
  if (c === 'w' || c === 'x' || c === 'y') return false;
  return true;
}

/** Doubled final consonant (stopped → stop, running → run). */
function doublesFinal(stem: string): boolean {
  if (stem.length < 3) return false;
  const last = stem[stem.length - 1]!;
  const prev = stem[stem.length - 2]!;
  const before = stem[stem.length - 3]!;
  return isConsonant(last) && last === prev && isVowel(before);
}

/**
 * Base form of an inflected verb, or null when we are not confident.
 *
 * Order of attempts: irregular table → third-person table → regular -ed/-ing
 * rules, each candidate accepted only if it is a word we actually know.
 */
export function baseFormOf(word: string): string | null {
  const w = word.toLowerCase();
  if (!w) return null;
  if (IRREGULAR_PAST_REVERSE[w]) return IRREGULAR_PAST_REVERSE[w]!;
  if (IRREGULAR_PARTICIPLE[w]) return IRREGULAR_PARTICIPLE[w]!;
  if (THIRD_SINGULAR_REVERSE[w]) return THIRD_SINGULAR_REVERSE[w]!;
  if (NEVER_INFLECT.has(w)) return null;
  if (KNOWN_WORDS.has(w)) return null; // already a plain form — nothing to reverse

  const candidates: string[] = [];
  if (w.length > 3 && w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    // "stopped" → "stopp" → the doubled consonant comes off: "stop"
    if (doublesFinal(stem)) candidates.push(stem.slice(0, -1));
    if (w.endsWith('ied')) {
      candidates.push(w.slice(0, -3) + 'y');
      candidates.push(w.slice(0, -3) + 'ie');
      candidates.push(stem);
    } else {
      if (takesSilentE(stem)) candidates.push(stem + 'e');
      candidates.push(stem);
    }
  } else if (w.length > 4 && w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (doublesFinal(stem)) candidates.push(stem.slice(0, -1));
    if (takesSilentE(stem)) candidates.push(stem + 'e');
    candidates.push(stem);
    if (stem.endsWith('y')) candidates.push(stem.slice(0, -1) + 'ie');
  }
  for (const c of candidates) {
    if (c && c !== w && KNOWN_WORDS.has(c)) return c;
  }
  return null;
}

/**
 * Verbs whose final consonant doubles before -ing. Spelling these by rule
 * alone gets them wrong ("comeing", "runing"), so they are listed.
 */
const DOUBLING_EXCEPTIONS = new Set([
  'begin', 'run', 'sit', 'stop', 'swim', 'plan', 'travel', 'forget', 'prefer',
  'admit', 'permit', 'commit', 'regret', 'control', 'patrol', 'propel', 'compel',
  'expel', 'repel', 'occur', 'refer', 'defer', 'infer', 'transmit', 'submit',
  'omit', 'equip', 'incur', 'acquit', 'upset', 'unwrap', 'adapt', 'allot',
  'pat', 'dot', 'hug', 'jog', 'rub', 'tug', 'beg', 'ban', 'clap', 'crop',
  'drop', 'fit', 'grip', 'hop', 'nod', 'ship', 'shop', 'sin', 'sip', 'skip',
  'slap', 'step', 'stir', 'strap', 'strip', 'swap', 'tap', 'tip', 'wrap', 'zip',
  'chat', 'quit', 'spit', 'split', 'wet', 'bat', 'bud', 'chat', 'grab', 'jab',
  'knit', 'plot', 'plug', 'scrub', 'scrib', 'slob', 'snub', 'strut', 'throb',
]);

/**
 * Present continuous form of a base verb.
 * "make" → making, "come" → coming, "run" → running, "lie" → lying,
 * "study" → studying.
 */
export function ingFormOf(base: string): string | null {
  const w = base.toLowerCase();
  if (!w) return null;
  // "run" → "run" + "n" + "ing" (the final consonant is doubled)
  if (DOUBLING_EXCEPTIONS.has(w)) return w + w.slice(-1) + 'ing';
  if (w.endsWith('ie')) return w.slice(0, -2) + 'ying';
  // "study" → "studying", "fly" → "flying", "carry" → "carrying"
  if (w.endsWith('y') && w.length > 1 && isConsonant(w[w.length - 2]!)) {
    return w.slice(0, -1) + 'ying';
  }
  if (w.endsWith('e') && !w.endsWith('ee') && !w.endsWith('oe') && !w.endsWith('ye')) {
    return w.slice(0, -1) + 'ing';
  }
  return w + 'ing';
}

/**
 * Words that follow "is/are/am" as an adjective or a noun in perfectly normal
 * English. Without this list "the shop is open" would be reported as a
 * be-verb + bare verb error.
 */
export const NON_VERB_AFTER_BE = new Set([
  'open', 'close', 'live', 'work', 'mean', 'sound', 'love', 'right', 'wrong',
  'well', 'ready', 'clear', 'true', 'false', 'sure', 'fine', 'free', 'full',
  'empty', 'good', 'great', 'bad', 'nice', 'kind', 'safe', 'hard', 'soft',
  'cold', 'hot', 'warm', 'cool', 'dark', 'light', 'heavy', 'strong', 'weak',
  'young', 'old', 'new', 'big', 'small', 'large', 'long', 'short', 'high',
  'low', 'late', 'early', 'busy', 'afraid', 'aware', 'alone', 'able',
  'available', 'possible', 'necessary', 'important', 'different', 'same',
  'similar', 'silent', 'still', 'fast', 'slow', 'quick', 'quiet', 'loud',
  'sick', 'ill', 'healthy', 'hungry', 'thirsty', 'angry', 'happy', 'sad',
  'glad', 'proud', 'sorry', 'willing', 'unable', 'likely', 'unlikely', 'usual',
  'strange', 'odd', 'funny', 'serious', 'single', 'double', 'whole', 'half',
  'own', 'ex', 'on', 'in', 'at', 'off', 'out', 'up', 'down', 'over', 'under',
]);
