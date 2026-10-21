/**
 * Optional CDN engines, made explicit.
 * Every engine can be downloaded into the offline Cache Storage upfront so it
 * works with no network afterwards. Nothing is ever loaded silently: the
 * Settings page is the only place installs happen.
 */

import { VOSK_MODEL_URL } from '../engines/recognizers/asr';
import { OCR_URL } from '../engines/recognizers/ocr';

export const ENGINE_CACHE = 'elowen-cdn';

export interface EngineUrl {
  url: string;
  /** Whether the host sends CORS headers (needed for byte-accurate progress). */
  cors: boolean;
}

export interface EngineDef {
  id: string;
  label: string;
  usedBy: string;
  wireSize: string;
  licence: string;
  detail: string;
  urls: EngineUrl[];
}

export const ENGINES: EngineDef[] = [
  {
    id: 'tesseract',
    label: 'Handwriting OCR (letters)',
    usedBy: 'Handwriting Lab → “Check letters”',
    wireSize: '≈2 MB',
    licence: 'Apache-2.0 (tesseract.js)',
    detail:
      'Recognises crisp machine-printed letters in photos of your writing so a drill can compare letters against a reference word. Runs on-device after the first load. It only compares text — never invents it — and reports honestly when its verdict is not reliable.',
    urls: [{ url: OCR_URL, cors: true }],
  },
  {
    id: 'vosk',
    label: 'Offline speech recognition (English)',
    usedBy: 'Speaking Lab → “Compare words”',
    wireSize: '≈40 MB first time',
    licence: 'vosk-browser Apache-2.0 + model CC-BY-NC',
    detail:
      'The Kaldi WASM recogniser runs fully offline. The small US-English model loads once (~40 MB) and is then cached, so transcript comparison works with no network at all. May be too heavy for older phones; the labs never fake the transcript either way.',
    urls: [
      { url: 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/dist/vosk-browser.esm.js', cors: true },
      { url: 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/lib/vosk.js', cors: true },
      { url: VOSK_MODEL_URL, cors: false },
    ],
  },
];

export async function clearEngineCache(): Promise<void> {
  await caches.delete(ENGINE_CACHE);
}

/** Reports whether every URL of an engine is already in the offline cache. */
export async function engineInstalled(def: EngineDef): Promise<boolean> {
  try {
    const cache = await caches.open(ENGINE_CACHE);
    for (const { url } of def.urls) {
      if (!(await cache.match(url))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function engineStatusMessage(step: number, total: number): string {
  return total > 1 ? `Part ${step} of ${total}` : 'Downloading…';
}

/**
 * Caches every URL of an engine into the offline store.
 * CORS hosts support byte-accurate progress; opaque hosts download without a
 * progress signal (reported honestly as “…”, not an invented percentage).
 */
export async function installEngine(def: EngineDef, onProgress: (pct: number) => void): Promise<void> {
  const cache = await caches.open(ENGINE_CACHE);
  onProgress(0);
  for (let i = 0; i < def.urls.length; i++) {
    const spec = def.urls[i];
    const cached = await cache.match(spec.url);
    if (cached) {
      onProgress(Math.round(((i + 1) / def.urls.length) * 100));
      continue;
    }
    const ok = spec.cors ? await downloadWithProgress(spec.url, cache, i, def.urls.length, onProgress) : 0;
    if (ok !== 100) {
      const resp = await fetch(spec.url, { mode: spec.cors ? 'cors' : 'no-cors' });
      if (spec.cors && !resp.ok) throw new Error(`Download refused (${resp.status}).`);
      await cache.put(spec.url, resp.clone());
    }
    onProgress(Math.round(((i + 1) / def.urls.length) * 100));
  }
  onProgress(100);
}

async function downloadWithProgress(
  url: string,
  cache: Cache,
  index: number,
  total: number,
  onProgress: (pct: number) => void,
): Promise<number> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new TypeError(`status ${resp.status}`);
    const lenHeader = resp.headers.get('content-length');
    const len = lenHeader ? Number(lenHeader) : 0;
    const stream = resp.body ? resp.body.getReader() : null;
    if (!stream || !len) {
      await cache.put(url, resp.clone());
      return 100;
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    // Read the stream exactly once and reassemble for cache.put.
    for (;;) {
      const { done, value } = await stream.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress(Math.round((((index + received / len) / total) * 100)));
      }
    }
    const blob = new Blob(chunks as BlobPart[]);
    await cache.put(url, new Response(blob, { headers: resp.headers }));
    return 100;
  } catch {
    return 0; // caller falls back to the plain (no progress) path
  }
}
