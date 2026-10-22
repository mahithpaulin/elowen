/**
 * Handwriting measurements built on the binary image.
 *
 * Design rules for this module:
 *  - every score is either gated (null when the underlying data is unreliable)
 *    or computed by a documented formula using median/MAD statistics;
 *  - the module measures geometry on the page (sizes, spacing, alignment,
 *    slant of ink) and nothing else — no personality, medical or intelligence
 *    claims are made anywhere in this codebase.
 */

import { robustCV, clamp, median, mean, linearFit } from '../../utils';
import type { AnalyzeOutput, MetricScore, Quality } from '../../types';
import type { BinImage, LabelledComponents } from './imageproc';
import { labelComponents } from './imageproc';
import { meanBrightness, sharpness } from './imageproc';

export interface LineInfo {
  top: number;
  bottom: number;
  comps: number[];
}

export interface MeasureResult {
  boxes: LabelledComponents | null;
  failed: boolean;
  lineCount: number;
  letterHeightCV: number | null;
  wordGapCV: number | null;
  lineSpacingCV: number | null;
  baselineSlopeRMS: number | null;
  slantDeg: number | null;
  slantReliable: boolean;
  inkCoverage: number;
}

interface CompBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
}

/* --------------------------- segmentation --------------------------- */

export function segmentLines(bin: BinImage, boxes: CompBox[]): LineInfo[] {
  // row projection
  const rows = new Float64Array(bin.h);
  for (let y = 0; y < bin.h; y++) {
    let s = 0;
    for (let x = 0; x < bin.w; x++) s += bin.data[y * bin.w + x];
    rows[y] = s;
  }
  const smooth = new Float64Array(bin.h);
  for (let y = 0; y < bin.h; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(bin.h - 1, y + 1);
    smooth[y] = (rows[y0] + rows[y] + rows[y1]) / 3;
  }
  let maxRow = 0;
  for (let y = 0; y < bin.h; y++) maxRow = Math.max(maxRow, smooth[y]);
  const floor = Math.max(1, maxRow * 0.08);
  const minLineH = Math.max(4, Math.round(bin.h * 0.015));

  const lines: LineInfo[] = [];
  let inSeg = false;
  let segStart = 0;
  for (let y = 0; y <= bin.h; y++) {
    const on = y < bin.h && smooth[y] > floor;
    if (on && !inSeg) {
      inSeg = true;
      segStart = y;
    } else if (!on && inSeg) {
      inSeg = false;
      if (y - segStart >= minLineH) lines.push({ top: segStart, bottom: y, comps: [] });
    }
  }
  // assign each component to the line with most vertical overlap
  for (let ci = 0; ci < boxes.length; ci++) {
    const b = boxes[ci];
    let bestLine = -1;
    let bestOv = 0;
    for (let li = 0; li < lines.length; li++) {
      const L = lines[li];
      const ov = Math.min(b.y1, L.bottom) - Math.max(b.y0, L.top);
      if (ov > bestOv) {
        bestOv = ov;
        bestLine = li;
      }
    }
    if (bestLine >= 0) lines[bestLine].comps.push(ci);
  }
  return lines;
}

/* ----------------------------- slant ----------------------------- */

/**
 * Principal-axis slant of one component, degrees; negative = left-lean,
 * positive = right-lean relative to vertical. Returns null when ambiguous.
 */
function componentSlant(bin: BinImage, b: CompBox): number | null {
  const w = b.x1 - b.x0 + 1;
  const h = b.y1 - b.y0 + 1;
  if (w < 3 || h < 5 || b.area < 40) return null;
  let sx = 0,
    sy = 0,
    sxx = 0,
    syy = 0,
    sxy = 0,
    n = 0;
  for (let y = b.y0; y <= b.y1; y++) {
    for (let x = b.x0; x <= b.x1; x++) {
      if (bin.data[y * bin.w + x]) {
        const dx = x - b.x0,
          dy = y - b.y0;
        n++;
        sx += dx;
        sy += dy;
        sxx += dx * dx;
        syy += dy * dy;
        sxy += dx * dy;
      }
    }
  }
  if (n < 40) return null;
  const mx = sx / n,
    my = sy / n;
  const mu20 = sxx / n - mx * mx;
  const mu02 = syy / n - my * my;
  const mu11 = sxy / n - mx * my;
  const denom = mu20 - mu02;
  if (Math.abs(denom) < 1e-9 && Math.abs(mu11) < 1e-9) return null;
  const theta = 0.5 * Math.atan2(2 * mu11, denom); // radians, from horizontal
  const deg = (theta * 180) / Math.PI; // −90..90
  // Express the axis as a deviation from the vertical:
  //   vertical stroke (deg = ±90) → 0,  horizontal stroke (deg = 0) → ±90.
  let v = deg >= 0 ? 90 - deg : -90 - deg;
  // Keep only letter-like strokes: an axis more than 45° away from vertical is
  // a horizontal bar (a cross-bar, a ruled line), not a letter body.
  // The previous test had this inverted — it rejected vertical strokes and
  // accepted horizontal ones, so the reported slant was meaningless.
  if (Math.abs(v) > 45) return null;
  return v;
}

/* --------------------------- full measure --------------------------- */

export function measure(bin: BinImage): MeasureResult {
  const totalPixels = bin.w * bin.h;
  const comps = labelComponents(bin);
  if (comps === null) {
    return {
      boxes: null,
      failed: true,
      lineCount: 0,
      letterHeightCV: null,
      wordGapCV: null,
      lineSpacingCV: null,
      baselineSlopeRMS: null,
      slantDeg: null,
      slantReliable: false,
      inkCoverage: 0,
    };
  }
  const lines = segmentLines(bin, comps.boxes);
  const W = bin.w;

  const letterHeights: number[] = [];
  const perLineCVs: Array<{ cv: number; n: number }> = [];
  const baselines: number[] = [];
  const slopes: number[] = [];
  const allGaps: number[] = [];
  let inkPixels = 0;

  for (const L of lines) {
    const lineH = L.bottom - L.top;
    const letterIdx: number[] = [];
    for (const ci of L.comps) {
      const b = comps.boxes[ci];
      const ch = b.y1 - b.y0 + 1;
      const cw = b.x1 - b.x0 + 1;
      if (b.area >= 6 && ch >= lineH * 0.22 && ch <= lineH * 2.6 && cw <= W * 0.9) {
        letterIdx.push(ci);
        letterHeights.push(ch);
      }
    }
    if (letterIdx.length >= 2) {
      const bottoms = letterIdx.map((ci) => comps.boxes[ci].y1);
      baselines.push(median(bottoms));
      // within-line baseline slope (vertical drift across the line)
      const xs = letterIdx.map((ci) => (comps.boxes[ci].x0 + comps.boxes[ci].x1) / 2);
      const fit = linearFit(xs, bottoms);
      slopes.push((Math.atan(fit.slope) * 180) / Math.PI);
      // height consistency
      if (letterIdx.length >= 3) {
        const cv = robustCV(letterIdx.map((ci) => comps.boxes[ci].y1 - comps.boxes[ci].y0 + 1));
        if (cv != null) perLineCVs.push({ cv, n: letterIdx.length });
      }
    }
    // gaps along the line
    const sortedIdx = [...letterIdx].sort((a, b) => comps.boxes[a].x0 - comps.boxes[b].x0);
    for (let k = 1; k < sortedIdx.length; k++) {
      const a = comps.boxes[sortedIdx[k - 1]];
      const b2 = comps.boxes[sortedIdx[k]];
      const gap = b2.x0 - a.x1;
      if (gap > 1) allGaps.push(gap);
    }
  }

  // word-gap split: largest ratio jump between consecutive sorted gaps
  let wordGapCV: number | null = null;
  const sorted = [...allGaps].sort((a, b) => a - b);
  if (sorted.length >= 6) {
    let split: number | null = null;
    let bestRatio = 2.2;
    for (let k = 2; k < sorted.length - 1; k++) {
      const lo = sorted[k - 1];
      const hi = sorted[k];
      if (lo <= 0) continue;
      const ratio = hi / lo;
      if (ratio >= bestRatio && hi - lo > 2) {
        bestRatio = ratio;
        split = (lo + hi) / 2;
      }
    }
    if (split != null) {
      const wordGaps = sorted.filter((g) => g > split!);
      if (wordGaps.length >= 3) wordGapCV = robustCV(wordGaps);
    }
  }

  // line spacing consistency
  const spacingDiffs: number[] = [];
  for (let li = 1; li < baselines.length; li++) {
    const d = baselines[li] - baselines[li - 1];
    if (d > 4) spacingDiffs.push(d);
  }
  const lineSpacingCV = spacingDiffs.length >= 2 ? robustCV(spacingDiffs) : null;

  // slant
  const slants: number[] = [];
  for (const b of comps.boxes) {
    const s = componentSlant(bin, b);
    if (s != null) slants.push(s);
  }
  let slantDeg: number | null = null;
  let slantReliable = false;
  if (slants.length >= 12) {
    const med = median(slants);
    const sortedS = [...slants].sort((a, b) => a - b);
    const q1 = sortedS[Math.floor(sortedS.length * 0.25)];
    const q3 = sortedS[Math.floor(sortedS.length * 0.75)];
    slantDeg = med;
    slantReliable = q3 - q1 <= 9 && slants.length >= 12;
  }

  // ink pixels
  for (let i = 0; i < bin.data.length; i++) inkPixels += bin.data[i];

  // height CV: average of within-line CVs weighted by count
  let letterHeightCV: number | null = null;
  if (perLineCVs.length > 0) {
    const total = perLineCVs.reduce((a, p) => a + p.n, 0);
    letterHeightCV = perLineCVs.reduce((a, p) => a + p.cv * p.n, 0) / total;
  }

  return {
    boxes: comps,
    failed: false,
    lineCount: lines.length,
    letterHeightCV,
    wordGapCV,
    lineSpacingCV,
    baselineSlopeRMS:
      slopes.length >= 2 ? Math.sqrt(mean(slopes.map((s) => s * s))) : null,
    slantDeg,
    slantReliable,
    inkCoverage: inkPixels / totalPixels,
  };
}

/* ----------------------------- quality ----------------------------- */

export function qualityFromGray(w: number, h: number, gray: Uint8Array): Quality {
  const g = { w, h, data: gray };
  const bright = meanBrightness(g);
  const lap = sharpness(g);
  const warnings: string[] = [];
  // normalise sharpness: divide by pixel scale so scores compare across sizes
  const sharp = lap / Math.max(1, Math.min(w, h) / 800);
  // Fraction of pixels that are essentially white — a blown-out photo loses
  // the edges of the strokes.
  let blown = 0;
  let crushed = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i]! >= 250) blown++;
    else if (gray[i]! <= 5) crushed++;
  }
  const blownRatio = gray.length ? blown / gray.length : 0;
  const crushedRatio = gray.length ? crushed / gray.length : 0;
  if (bright < 80) warnings.push('The photo looks quite dark — more light will improve the analysis.');
  else if (bright > 248) warnings.push('The photo looks washed out — try softer lighting.');
  if (blownRatio > 0.45) warnings.push('Large parts of the photo are pure white — the strokes lose their edges.');
  if (crushedRatio > 0.35) warnings.push('Large parts of the photo are pure black — the paper is too dark to read.');
  if (sharp < 140) warnings.push('The image is soft or blurred. Hold the camera steady or scan the page.');
  if (w * h < 220 * 180) warnings.push('The image is small. Use full-size originals when uploading.');
  const q = clamp(
    60 +
      (bright >= 110 && bright <= 235 ? 20 : 5) +
      (sharp >= 300 ? 20 : sharp >= 180 ? 10 : 0) -
      (blownRatio > 0.45 ? 10 : 0) -
      (crushedRatio > 0.35 ? 10 : 0),
    5,
    100,
  );
  return { score: q, brightness: bright, sharpness: sharp, warnings };
}

/* ------------------------------ scores ------------------------------ */

/**
 * Score curves (documented in the report UI):
 *  letter-size consistency:  100 − 260·CV  (CV 0.10 ≈ 74, CV 0.25 ≈ 35)
 *  word-spacing consistency: 100 − 240·CV
 *  line alignment:           100 − 22·deg
 *  line-spacing consistency: 100 − 250·CV
 */
export function scoreResult(m: MeasureResult, q: Quality): MetricScore[] {
  const out: MetricScore[] = [];

  const letterScore =
    m.letterHeightCV == null
      ? null
      : clamp(100 - 260 * m.letterHeightCV, 0, 100);
  out.push({
    key: 'letterHeight',
    label: 'Letter-size consistency',
    value: m.letterHeightCV == null ? null : Math.round(m.letterHeightCV * 100) / 100,
    unit: 'CV',
    score: letterScore,
    gate:
      m.letterHeightCV == null
        ? 'Needs at least one line with 3+ letter components; cursive joins can hide individual letters.'
        : null,
    note: 'Within-line variation of letter heights (median/MAD).',
  });

  const spacingScore =
    m.wordGapCV == null ? null : clamp(100 - 240 * m.wordGapCV, 0, 100);
  out.push({
    key: 'wordSpacing',
    label: 'Word-spacing consistency',
    value: m.wordGapCV == null ? null : Math.round(m.wordGapCV * 100) / 100,
    unit: 'CV',
    score: spacingScore,
    gate:
      m.wordGapCV == null
        ? 'Needs 6+ clear gaps and 3+ detected word gaps; cursive writing may hide them.'
        : null,
    note: 'How evenly words are separated along the lines.',
  });

  const alignScore =
    m.baselineSlopeRMS == null ? null : clamp(100 - 22 * m.baselineSlopeRMS, 0, 100);
  out.push({
    key: 'lineAlignment',
    label: 'Line alignment',
    value: m.baselineSlopeRMS == null ? null : Math.round(m.baselineSlopeRMS * 100) / 100,
    unit: '°',
    score: alignScore,
    gate: m.baselineSlopeRMS == null ? 'Needs at least two detected lines.' : null,
    note: 'Median baseline slope of each line (deviation from horizontal).',
  });

  const spacingLinesScore =
    m.lineSpacingCV == null ? null : clamp(100 - 250 * m.lineSpacingCV, 0, 100);
  out.push({
    key: 'lineSpacing',
    label: 'Line-spacing consistency',
    value: m.lineSpacingCV == null ? null : Math.round(m.lineSpacingCV * 100) / 100,
    unit: 'CV',
    score: spacingLinesScore,
    gate: m.lineSpacingCV == null ? 'Needs at least three detected lines.' : null,
    note: 'How evenly baselines are spaced apart.',
  });

  out.push({
    key: 'slant',
    label: 'Slant',
    value: m.slantDeg == null ? null : Math.round(m.slantDeg * 10) / 10,
    unit: '°',
    score: null, // descriptive, not scored — slant is a preference, not a fault
    gate:
      m.slantDeg == null || !m.slantReliable
        ? 'Not enough consistent letter shapes to estimate slant reliably.'
        : null,
    note: 'Positive = leans right. A preference, not a fault; not scored.',
  });

  void q;
  return out;
}

export function overallScore(scores: MetricScore[]): number | null {
  const good = scores.filter((s) => s.score != null);
  if (good.length < 2) return null;
  const m = good.reduce((a, s) => a + (s.score ?? 0), 0) / good.length;
  return Math.round(clamp(m, 0, 100));
}
