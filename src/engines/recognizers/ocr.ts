/**
 * Handwriting recognition adapter.
 *
 * Engine choice (evaluated 2026-10-21):
 *  - tesseract.js v5: Apache-2.0, WASM in the browser, English traineddata
 *    (eng.traineddata.gz ≈ 11 MB) fetches from a free CDN (jsDelivr) on first
 *    use and runs locally afterwards in that session. No API key, no cost.
 *  - Alternatives considered: cv-OCR bridging to native tools (needs server),
 *    Kraken (Python-only), TrOCR/HTR models (generative-range, heavy).
 *
 * The adapter is deliberately isolated behind `HandwritingRecognizer` so the
 * engine can be replaced later without touching UI code. All network fetching
 * happens once, at explicit user request, and failures surface as an
 * 'error' status with the reason — the app NEVER invents text.
 */

import type { OcrWord } from '../../types';

const TESSERACT_VERSION = '5.1.1';
const TESSERACT_CORE_VERSION = '5.1.1';

export const OCR_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;
export const OCR_WORKER_URL = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`;
export const OCR_CORE_URL = `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_CORE_VERSION}`;
export const OCR_LANG_PATH = 'https://tessdata.projectnaptha.com/4.0.0';
export const OCR_LANG_URL = `${OCR_LANG_PATH}/eng.traineddata.gz`;
/** The SIMD + LSTM core pair a modern browser actually loads. */
export const OCR_CORE_FILES = [
  `${OCR_CORE_URL}/tesseract-core-simd-lstm.wasm.js`,
  `${OCR_CORE_URL}/tesseract-core-simd-lstm.wasm`,
];

/** Every file the engine needs on disk to work with no network at all. */
export const OCR_ASSETS: string[] = [
  OCR_URL,
  OCR_WORKER_URL,
  ...OCR_CORE_FILES,
  OCR_LANG_URL,
];

const TESSERACT_CDN = OCR_URL;

export type RecognizerStatus =
  | { state: 'idle' }
  | { state: 'loading'; message: string }
  | { state: 'ready' }
  | { state: 'error'; message: string };

export interface HandwritingRecognizer {
  readonly engineId: string;
  readonly status: RecognizerStatus;
  /** Fetch engine assets and initialise. Idempotent. */
  init(html?: HTMLElement): Promise<void>;
  /** @returns recognised words with ASCII confidences 0..100. */
  recognize(img: HTMLCanvasElement): Promise<TessWordLike[]>;
}

interface TessWordLike {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

interface TessWorker {
  recognize(img: HTMLCanvasElement | Blob | string): Promise<RecognizeData>;
  terminate(): Promise<void>;
}

interface RecognizeData {
  data: {
    words?: Array<{ text?: string; confidence?: number; bbox?: { x0: number; y0: number; x1: number; y1: number } }>;
    text?: string;
  };
}

interface TessGlobal {
  createWorker(lang: string, oem: number, opts?: Record<string, unknown>): Promise<TessWorker>;
}

declare global {
  interface Window {
    Tesseract?: TessGlobal;
  }
}

function withScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-el="elowen-ocr"]`);
    if (existing) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.el = 'elowen-ocr';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load the OCR engine script from the CDN.'));
    document.head.appendChild(s);
  });
}

export class TesseractAdapter implements HandwritingRecognizer {
  readonly engineId = 'tesseract.js-v5/eng';
  private _status: RecognizerStatus = { state: 'idle' };
  private worker: TessWorker | null = null;
  private inflight: Promise<void> | null = null;

  get status(): RecognizerStatus {
    return this._status;
  }

  async init(_html?: HTMLElement): Promise<void> {
    if (this._status.state === 'ready') return;
    if (this.inflight) return this.inflight;
    this._status = { state: 'loading', message: 'Downloading the OCR engine (~13 MB, one-time download)…' };
    try {
      this.inflight = (async () => {
        await withScript(TESSERACT_CDN);
        if (!window.Tesseract) throw new Error('OCR engine loaded but did not initialise.');
        this.worker = await window.Tesseract.createWorker('eng', 1, {
          // Explicit paths: the defaults are the same, but naming them means
          // the offline installer knows exactly which files to cache, so the
          // "offline-ready" badge in Settings means what it says.
          workerPath: OCR_WORKER_URL,
          corePath: OCR_CORE_URL,
          langPath: OCR_LANG_PATH,
          logger: () => {
            /* intentionally silent; UI shows a fixed progress note */
          },
        });
      })();
      await this.inflight;
      this._status = { state: 'ready' };
    } catch (e) {
      this._status = { state: 'error', message: errorMessage(e) };
      this.worker = null;
    } finally {
      this.inflight = null;
    }
  }

  async recognize(canvas: HTMLCanvasElement): Promise<TessWordLike[]> {
    if (this._status.state !== 'ready') throw new Error('The OCR engine is not ready yet.');
    const w = this.worker as TessWorker | null;
    if (!w) throw new Error('Engine missing.');
    const res = await w.recognize(canvas);
    const words: TessWordLike[] = [];
    for (const wd of res.data.words ?? []) {
      const text = (wd.text ?? '').trim();
      const conf = typeof wd.confidence === 'number' ? wd.confidence : 0;
      if (text) words.push({ text, confidence: conf, bbox: wd.bbox ?? { x0: 0, y0: 0, x1: 0, y1: 0 } });
    }
    return words;
  }
}

export function wordsFromTess(list: TessWordLike[]): OcrWord[] {
  return list.map((w) => ({ word: w.text, confidence: Math.round(w.confidence) }));
}

function errorMessage(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  if (/fetch|network|Failed to load/i.test(m)) {
    return 'The OCR engine needs a one-time download (offline use now unavailable). Check the connection and try again.';
  }
  return `OCR engine failed: ${m}`;
}

export const ocr = new TesseractAdapter();
