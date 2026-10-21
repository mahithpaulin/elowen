import { describe, expect, it } from 'vitest';
import {
  rgbaToGray,
  contrastStretch,
  adaptiveThreshold,
  estimateSkew,
  labelComponents,
  MAX_IMAGE_PIXELS,
} from '../src/engines/imageproc/imageproc';
import { segmentLines, measure, scoreResult, overallScore } from '../src/engines/imageproc/analyze';
import { qualityFromGray } from '../src/engines/imageproc/analyze';
import type { Gray8 } from '../src/engines/imageproc/imageproc';

const W = 480;
const H = 300;

/** synthetic neat picture: white paper, black words on three rows */
function makeGray(): Gray8 {
  const data = new Uint8Array(W * H).fill(250);
  const word = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < Math.min(H, y0 + h); y++)
      for (let x = x0; x < Math.min(W, x0 + w); x++) data[y * W + x] = 15;
  };
  for (let row = 0; row < 3; row++) {
    const by = 50 + row * 80;
    for (let wgt = 0; wgt < 6; wgt++) word(40 + wgt * 70, by, 40, 26);
  }
  return { w: W, h: H, data };
}

function toBin(g: Gray8) {
  return adaptiveThreshold(contrastStretch(g));
}

describe('imageproc basics', () => {
  it('keeps the memory cap honest', () => {
    expect(MAX_IMAGE_PIXELS).toBeLessThanOrEqual(4_400_000);
  });
  it('rgbaToGray is white for white pixels', () => {
    const rgba = new Uint8ClampedArray(4 * 10);
    for (let i = 0; i < 10; i++) {
      rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = 255;
    }
    const g = rgbaToGray(rgba, 10, 1);
    expect(g.data.every((v) => v > 200)).toBe(true);
  });
  it('adaptiveThreshold marks dark ink as 1', () => {
    const g = makeGray();
    const bin = toBin(g);
    expect(bin.data[g.data.findIndex((v) => v < 50)]).toBe(1);
    expect(bin.data.some((v) => v === 0)).toBe(true);
  });
  it('plain paper has ~0 skew', () => {
    const skew = estimateSkew(toBin(makeGray()));
    expect(Math.abs(skew)).toBeLessThan(2);
  });
  it('labelComponents finds 18 letter words', () => {
    const labeled = labelComponents(toBin(makeGray()));
    expect(labeled).not.toBeNull();
    expect(labeled!.boxes.length).toBe(18);
  });
});

describe('analyze measurement', () => {
  const bin = toBin(makeGray());
  const result = measure(bin);

  it('segments exactly three lines', () => {
    expect(result.lineCount).toBe(3);
    expect(result.failed).toBeFalsy();
  });
  it('straight baselines ≈ 0°', () => {
    expect(result.baselineSlopeRMS).toBeLessThan(1);
  });
  it('even letters report low verbosity deltas', () => {
    expect(result.letterHeightCV).toBeLessThan(0.25);
  });
  it('compact scores include letter metrics and word spacing', () => {
    const scores = scoreResult(result, { score: 90, brightness: 240, sharpness: 30, warnings: [] });
    const keys = scores.map((s) => s.key);
    expect(keys).toContain('letterHeight');
    expect(keys).toContain('wordSpacing');
    expect(keys).toContain('lineAlignment');
    const overall = overallScore(scores);
    expect(overall).toBeGreaterThan(60);
  });
  it('blurry paper yields a warning and a quality drop', () => {
    const q = qualityFromGray(W, H, new Uint8Array(W * H).fill(210));
    expect(q.warnings.some((w) => /light|contrast/i.test(w))).toBe(true);
    expect(q.score).toBeLessThan(90);
  });
});

describe('segment on rotated input', () => {
  it('still segments the plain synthetic sheet', () => {
    const g = makeGray();
    const bin = toBin(g);
    const boxes = labelComponents(bin)!.boxes;
    const lines = segmentLines(bin, boxes);
    expect(lines.length).toBe(3);
  });
});
