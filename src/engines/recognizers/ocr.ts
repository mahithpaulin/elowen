/**
 * Handwriting recognition adapter.
 *
 * Engine choice (evaluated 2026-10-21):
 *  - tesseract.js v5: Apache-2.0, WASM in the browser, English traineddata
 *    (eng.traineddata.gz ≈ 23 MB) fetches from a free CDN (jsDelivr) on first
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

const TESSERACT_CDN =
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

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
    words?: Array<{ text?: string; confidence?: number }>;
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

  async init(): Promise<void> {
    if (this._status.state === 'ready') return;
    if (this.inflight) return this.inflight;
    this._status = { state: 'loading', message: 'Downloading the OCR engine (~40 MB, one-time per session)…' };
    try {
      this.inflight = (async () => {
        await withScript(TESSERACT_CDN);
        if (!window.Tesseract) throw new Error('OCR engine loaded but did not initialise.');
        this.worker = await window.Tesseract.createWorker('eng', 1, {
          // Tesseract.js 5 auto-picks worker/core/lang paths on the same CDN.
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
      if (text) words.push({ text, confidence: conf });
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
