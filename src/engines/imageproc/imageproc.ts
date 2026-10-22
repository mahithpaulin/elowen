/**
 * Deterministic image preprocessing for handwriting photographs.
 * Pure TypeScript operating on Uint8Array buffers — no OpenCV, no WebGL.
 *
 * All functions are side-effect free so they can be unit tested with
 * synthetic buffers.
 */

export interface Gray8 {
  w: number;
  h: number;
  data: Uint8Array; // length w*h
}

export interface BinImage {
  w: number;
  h: number;
  data: Uint8Array; // 1 = ink (dark), 0 = background
}

export const MAX_IMAGE_PIXELS = 4_200_000; // ~2300×1800 — keep phone memory sane

export function clamp255(x: number): number {
  return x < 0 ? 0 : x > 255 ? 255 : x | 0;
}

/* ------------------------------ colour ------------------------------ */

/** ITU-R BT.601 luma from RGBA bytes. */
export function rgbaToGray(rgba: Uint8ClampedArray, w: number, h: number): Gray8 {
  const data = new Uint8Array(w * h);
  for (let i = 0, p = 0; p < data.length; i += 4, p++) {
    data[p] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  return { w, h, data };
}

/* ------------------------------ metrics ------------------------------ */

export function meanBrightness(g: Gray8): number {
  let s = 0;
  for (let i = 0; i < g.data.length; i++) s += g.data[i];
  return s / g.data.length;
}

/** Variance of the 3×3 Laplacian — high for sharp text, low for blurred photos. */
export function sharpness(g: Gray8): number {
  const { w, h, data } = g;
  if (w < 3 || h < 3) return 0;
  let sum = 0,
    sum2 = 0,
    n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = data[i - w] + data[i + w] + data[i - 1] + data[i + 1] - 4 * data[i];
      sum += lap;
      sum2 += lap * lap;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

export function percentileOf(g: Gray8, p: number): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < g.data.length; i++) hist[g.data[i]]++;
  const target = Math.round(g.data.length * p);
  let acc = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= target) return v;
  }
  return 255;
}

/* ----------------------------- contrast ----------------------------- */

/**
 * Robust contrast stretch saturating 2% dark / 98% bright percentiles.
 * Returns a new buffer; leaves the input untouched.
 *
 * The result is clamped to 0..255 on purpose: values below the low percentile
 * are negative, and writing a negative number into a Uint8Array wraps it round
 * to 255 — which turned the darkest ink of a page white before thresholding.
 */
export function contrastStretch(g: Gray8, lowP = 0.02, highP = 0.98): Gray8 {
  const lo = percentileOf(g, lowP);
  const hi = percentileOf(g, highP);
  const scale = hi - lo <= 1 ? 1 : 255 / (hi - lo);
  const data = new Uint8Array(g.data.length);
  for (let i = 0; i < g.data.length; i++) {
    data[i] = clamp255((g.data[i] - lo) * scale);
  }
  return { w: g.w, h: g.h, data };
}

/* ------------------------------ denoise ------------------------------ */

/** 3×3 median filter (slows down salt-and-pepper noise before thresholding). */
export function medianDenoise(g: Gray8): Gray8 {
  const { w, h } = g;
  const out = new Uint8Array(g.data.length);
  const win = new Uint8Array(9);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          win[k++] = g.data[yy * w + xx];
        }
      }
      // insertion sort of 9 values
      for (let i = 1; i < 9; i++) {
        const v = win[i];
        let j = i - 1;
        while (j >= 0 && win[j] > v) {
          win[j + 1] = win[j];
          j--;
        }
        win[j + 1] = v;
      }
      out[y * w + x] = win[4];
    }
  }
  return { w, h, data: out };
}

/* --------------------------- thresholding --------------------------- */

/**
 * Mean adaptive threshold using a summed-area table (Bradley-style).
 * `winFrac` is the window side as a fraction of image width (default 1/24),
 * `bias` is the fraction of the local mean subtracted to mark ink.
 * Ink is 1 (text ends up darker than paper backgrounds).
 */
export function adaptiveThreshold(g: Gray8, winFrac = 1 / 24, bias = 0.09): BinImage {
  const { w, h, data } = g;
  const win = Math.max(9, Math.round(w * winFrac) | 1);
  const half = win >> 1;
  // integral image with padding row/col
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += data[y * w + x];
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum;
    }
  }
  const bin = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - half),
      y1 = Math.min(h - 1, y + half);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - half),
        x1 = Math.min(w - 1, x + half);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const s =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0];
      const mean = s / area;
      bin[y * w + x] = data[y * w + x] < mean * (1 - bias) ? 1 : 0;
    }
  }
  return { w, h, data: bin };
}

/* ------------------------------ rotation ------------------------------ */

/** Bilinear rotate around centre; empty corners becoming pure white (255). */
export function rotate(g: Gray8, deg: number): Gray8 {
  const { w, h, data } = g;
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad),
    sin = Math.sin(rad);
  const cx = w / 2,
    cy = h / 2;
  const out = new Uint8Array(w * h).fill(255);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x - cx,
        dy = y - cy;
      const sx = cos * dx + sin * dy + cx;
      const sy = -sin * dx + cos * dy + cy;
      if (sx < 0 || sy < 0 || sx >= w - 1 || sy >= h - 1) continue;
      const x0 = sx | 0,
        y0 = sy | 0;
      const fx = sx - x0,
        fy = sy - y0;
      const a = data[y0 * w + x0],
        b = data[y0 * w + x0 + 1],
        c = data[(y0 + 1) * w + x0],
        dd = data[(y0 + 1) * w + x0 + 1];
      out[y * w + x] = (a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + dd * fx * fy) | 0;
    }
  }
  return { w, h, data: out };
}

/* ------------------------------ deskew ------------------------------ */

/** Row-projection profile variance — higher when lines are horizontal. */
function projectionVariance(g: Gray8): number {
  const { w, h, data } = g;
  const rows = new Float64Array(h);
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] < 128) s++;
    }
    rows[y] = s;
  }
  let m = 0;
  for (let y = 0; y < h; y++) m += rows[y];
  m /= h;
  let v = 0;
  for (let y = 0; y < h; y++) v += (rows[y] - m) ** 2;
  return v / h;
}

/** Estimate skew in degrees within ±6° (coarse 1° + refine 0.25°). */
export function estimateSkew(bin: BinImage, maxDeg = 6): number {
  const asGray: Gray8 = { w: bin.w, h: bin.h, data: bin.data.map((v) => (v ? 0 : 255)) };
  let best = 0,
    bestV = projectionVariance(asGray);
  for (let a = -maxDeg; a <= maxDeg; a += 1) {
    if (a === 0) continue;
    const v = projectionVariance(rotate(asGray, a));
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  for (let a = best - 1; a <= best + 1; a += 0.25) {
    if (a === best || a === 0) continue;
    const v = projectionVariance(rotate(asGray, a));
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return Math.round(best * 100) / 100;
}

/* ------------------------- connected components ------------------------- */

export interface LabelledComponents {
  count: number;
  labels: Uint8Array; // visited flags, smaller memory footprint than Int32
  boxes: Array<{ x0: number; y0: number; x1: number; y1: number; area: number }>;
}

interface CompBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  area: number;
}

/** 8-connected component labelling by stack BFS. Rejects pathological images. */
export function labelComponents(bin: BinImage, maxComps = 6000): LabelledComponents | null {
  const { w, h, data } = bin;
  const visited = new Uint8Array(w * h);
  const boxes: CompBox[] = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!data[start] || visited[start]) continue;
    if (boxes.length >= maxComps) return null;
    let top = 0;
    stack[top++] = start;
    visited[start] = 1;
    let x0 = start % w,
      x1 = x0,
      y0 = (start / w) | 0,
      y1 = y0,
      area = 0;
    while (top > 0) {
      const p = stack[--top];
      const px = p % w,
        py = (p / w) | 0;
      area++;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = py + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = px + dx;
          if (xx < 0 || xx >= w) continue;
          const q = yy * w + xx;
          if (data[q] && !visited[q]) {
            visited[q] = 1;
            stack[top++] = q;
          }
        }
      }
    }
    boxes.push({ x0, y0, x1, y1, area });
  }
  return { count: boxes.length, labels: visited, boxes };
}
