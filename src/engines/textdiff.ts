import type { CompareResult, TokenDiff } from '../types';

const PUNCT = /[.,;:!?…"'“”‘’()[\]{}—–\/-]/;

export function tokenise(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .split(/[\s—–]+/)
    .map((t) => t.replace(/^[.,"'“”‘’()\[\]{}!?;:]+/g, ''))
    .map((t) => t.replace(/[.,"'“”‘’()\[\]{}!?;:]+$/g, ''))
    .filter((t) => t.length > 0);
}

/** DP alignment; equality is exact token match (accented vs unaccented: lowercased already). */
export function alignTokens(ref: string[], got: string[]): TokenDiff[] {
  const n = ref.length,
    m = got.length;
  const ONE = 1;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const eq = ref[i - 1] === got[j - 1];
      dp[i][j] = Math.min(
        dp[i - 1][j] + ONE, // deletion of ref word
        dp[i][j - 1] + ONE, // insertion of extra word
        dp[i - 1][j - 1] + (eq ? 0 : ONE),
      );
    }
  }
  // Backtrack
  const out: TokenDiff[] = [];
  let i = n,
    j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (ref[i - 1] === got[j - 1] ? 0 : 1)) {
      out.push({
        kind: ref[i - 1] === got[j - 1] ? 'match' : 'sub',
        reference: ref[i - 1],
        produced: got[j - 1],
        indexInReference: i - 1,
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      out.push({ kind: 'del', reference: ref[i - 1], indexInReference: i - 1 });
      i--;
    } else {
      out.push({ kind: 'ins', produced: got[j - 1] });
      j--;
    }
  }
  return out.reverse();
}

/**
 * Compare a produced transcript/OCR text against the reference sentence.
 * Deterministic edit-distance alignment on lowercase tokens.
 * Punctuation differences are ignored; word differences are the signal.
 */
export function compareReference(reference: string, produced: string): CompareResult {
  const ref = tokenise(reference);
  const got = tokenise(produced);
  if (ref.length === 0) return { tokens: [], similarity: 0 };
  const tokens = alignTokens(ref, got);
  const matches = tokens.filter((t) => t.kind === 'match').length;
  return { tokens, similarity: matches / ref.length };
}

export function stripSurroundingPunct(word: string): string {
  return word
    .split('')
    .filter((ch) => !PUNCT.test(ch))
    .join('');
}
