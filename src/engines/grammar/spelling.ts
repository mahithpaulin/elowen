import { COMMON_WORDS, IRREGULAR_PAST_REVERSE } from './dictionary';

export const WORD_SET: Set<string> = new Set([
  ...COMMON_WORDS,
  ...Object.keys(IRREGULAR_PAST_REVERSE),
]);

/** Common misspellings → corrections (authored, verified list). */
export const MISSPELLINGS: Record<string, string> = {
  acheive: 'achieve',
  adress: 'address',
  recieve: 'receive',
  tommorrow: 'tomorrow',
  agressive: 'aggressive',
  alot: 'a lot',
  amature: 'amateur',
  arguement: 'argument',
  aswell: 'as well',
  becuase: 'because',
  begining: 'beginning',
  beleive: 'believe',
  beleived: 'believed',
  buisness: 'business',
  calender: 'calendar',
  camoflage: 'camouflage',
  cemetary: 'cemetery',
  commited: 'committed',
  concience: 'conscience',
  definately: 'definitely',
  definatly: 'definitely',
  desireable: 'desirable',
  diffrent: 'different',
  dissapear: 'disappear',
  embarass: 'embarrass',
  enviroment: 'environment',
  equiptment: 'equipment',
  excercise: 'exercise',
  existance: 'existence',
  explaning: 'explaining',
  familer: 'familiar',
  finaly: 'finally',
  foriegn: 'foreign',
  fourty: 'forty',
  freind: 'friend',
  gaurd: 'guard',
  goverment: 'government',
  grammer: 'grammar',
  garantee: 'guarantee',
  harrass: 'harass',
  happend: 'happened',
  hige: 'huge',
  immediatly: 'immediately',
  independant: 'independent',
  interupt: 'interrupt',
  intrest: 'interest',
  knowlege: 'knowledge',
  labratory: 'laboratory',
  liason: 'liaison',
  libary: 'library',
  litterature: 'literature',
  maintainance: 'maintenance',
  managable: 'manageable',
  mariage: 'marriage',
  mispell: 'misspell',
  neccessary: 'necessary',
  noticable: 'noticeable',
  occassion: 'occasion',
  oppurtunity: 'opportunity',
  oximoron: 'oxymoron',
  parralel: 'parallel',
  particuly: 'particularly',
  payed: 'paid',
  peice: 'piece',
  perfom: 'perform',
  perseverence: 'perseverance',
  posession: 'possession',
  posible: 'possible',
  prefered: 'preferred',
  priviledge: 'privilege',
  probaly: 'probably',
  pronounciation: 'pronunciation',
  publically: 'publicly',
  realy: 'really',
  recomend: 'recommend',
  refered: 'referred',
  relevent: 'relevant',
  religous: 'religious',
  remeber: 'remember',
  responsability: 'responsibility',
  rythm: 'rhythm',
  saftey: 'safety',
  seperate: 'separate',
  similer: 'similar',
  sincerly: 'sincerely',
  speach: 'speech',
  strenght: 'strength',
  suprise: 'surprise',
  suprised: 'surprised',
  taked: 'took',
  catched: 'caught',
  bringed: 'brought',
  buyed: 'bought',
  eated: 'ate',
  doed: 'did',
  goed: 'went',
  runned: 'ran',
  sayed: 'said',
  speaked: 'spoke',
  writed: 'wrote',
  maked: 'made',
  thinked: 'thought',
  feeled: 'felt',
  forgeted: 'forgot',
  gived: 'gave',
  teached: 'taught',
    teh: 'the',
  thay: 'they',
  thier: 'their',
  tommorow: 'tomorrow',
  truely: 'truly',
  untill: 'until',
  usualy: 'usually',
  vaccum: 'vacuum',
  wether: 'whether',
  wich: 'which',
  wierd: 'weird',
  writen: 'written',
  yatch: 'yacht',
};

/** `true` when the two words differ by exactly one edit (insert/delete/swap/replace). */
export function isEditDistanceOne(a: string, b: string): boolean {
  const d1 = a.length,
    d2 = b.length;
  if (Math.abs(d1 - d2) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < d1 && j < d2) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (d1 > d2) i++;
    else if (d1 < d2) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (d1 - i) + (d2 - j) <= 1;
}

const CANDIDATE_CACHE = new Map<string, string | null>();

/**
 * Suggest a correction for a word not in the dictionary:
 * first the authored misspelling table, then a bounded distance-1
 * dictionary scan. Returns null when no candidate exists.
 *
 * The scan only accepts a candidate that starts with the same letter. Real
 * misspellings almost always keep the first letter ("teh" → "the",
 * "recieve" → "receive"); candidates that do not are usually a *different*
 * word ("kid" → "did", "car" → "can") and produced nonsense advice. The
 * authored table carries the known exceptions.
 */
export function suggestSpelling(word: string): string | null {
  const w = word.toLowerCase();
  if (WORD_SET.has(w)) return null;
  if (CANDIDATE_CACHE.has(w)) return CANDIDATE_CACHE.get(w) ?? null;
  let best: string | null = MISSPELLINGS[w] ?? null;
  if (best == null) {
    const wl = w.length;
    const first = w[0];
    let bestLenDelta = Infinity;
    for (const cand of WORD_SET) {
      if (Math.abs(cand.length - wl) > 1) continue;
      if (cand[0] !== first) continue;
      if (!isEditDistanceOne(w, cand)) continue;
      const delta = Math.abs(cand.length - wl);
      if (delta < bestLenDelta || (delta === bestLenDelta && cand < best!)) {
        best = cand;
        bestLenDelta = delta;
      }
    }
  }
  CANDIDATE_CACHE.set(w, best);
  return best ?? null;
}

/** Possibly misspelled? Not in dictionary, and a distance-1 suggestion exists. */
export function likelyMisspelled(word: string): string | null {
  const w = word.toLowerCase();
  if (WORD_SET.has(w) || w.length <= 2) return null;
  return suggestSpelling(w) ?? null;
}
