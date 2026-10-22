/**
 * Optional CDN engines, made explicit.
 * Every engine can be downloaded into Cache Storage upfront for reuse.
 * Nothing is ever loaded silently: the Settings page is the only place
 * installs happen.
 */

import { VOSK_MODEL_URL } from '../engines/recognizers/asr';
import { OCR_ASSETS, OCR_URL } from '../engines/recognizers/ocr';

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
    // The real footprint: the script plus the WASM core plus the English
    // language data. The old label said 2 MB while the engine actually pulled
    // about 13 MB — the badge has to be honest about the download.
    wireSize: '≈13 MB',
    licence: 'Apache-2.0 (tesseract.js)',
    detail:
      'Recognises crisp machine-printed letters in photos of your writing so a drill can compare letters against a reference word. Runs on-device after the first load. It only compares text — never invents it — and reports honestly when its verdict is not reliable. The download is the WASM core plus the English language data; on a browser without WASM SIMD the core falls back to a smaller file, which is fetched once and then kept in the browser cache.',
    urls: OCR_ASSETS.map((url) => ({ url, cors: true })),
  },
  {
    id: 'vosk',
    label: 'Offline speech recognition (English)',
    usedBy: 'Speaking Lab → “Transcribe & score”',
    wireSize: '≈47 MB first time',
    licence: 'vosk-browser Apache-2.0 + model CC-BY-NC',
    detail:
      'The Kaldi WASM recogniser runs fully offline. The small US-English model loads once (~40 MB) and is kept in the browser cache, so later runs usually need no network; browsers may evict large caches under storage pressure. May be too heavy for older phones; the labs never fake the transcript either way.',
    urls: [
      { url: 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/dist/vosk.js', cors: true },
      { url: VOSK_MODEL_URL, cors: true },
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
 *
 * Progress is weighted by the real file sizes, not by file count: the speech
 * engine is one 5.6 MB script and one 41 MB model, and a "50%" that arrives
 * after the small file is not a useful number on a phone.
 */
export async function installEngine(def: EngineDef, onProgress: (pct: number) => void): Promise<void> {
  const cache = await caches.open(ENGINE_CACHE);
  const sizes = await Promise.all(def.urls.map((u) => probeSize(u.url)));
  const known = sizes.reduce((a, b) => a + b, 0);
  // Fall back to an even split when the server will not report a length.
  const unit = known > 0 ? known / def.urls.length : 1;
  const total = known > 0 ? known : def.urls.length;
  let done = 0;
  const report = (bytes: number): void =>
    onProgress(Math.max(0, Math.min(100, Math.round(((done + bytes) / total) * 100))));
  onProgress(0);
  for (let i = 0; i < def.urls.length; i++) {
    const spec = def.urls[i]!;
    const size = sizes[i] ?? unit;
    const cached = await cache.match(spec.url);
    if (cached) {
      done += size;
      report(0);
      continue;
    }
    const ok = await downloadWithProgress(spec.url, cache, report, size);
    if (!ok) {
      const resp = await fetch(spec.url, { mode: spec.cors ? 'cors' : 'no-cors' });
      if (spec.cors && !resp.ok) throw new Error(`Download refused (${resp.status}).`);
      await cache.put(spec.url, resp.clone());
    }
    done += size;
    report(0);
  }
  onProgress(100);
}

/** Content length of a URL, or 0 when the server does not say. */
async function probeSize(url: string): Promise<number> {
  try {
    const resp = await fetch(url, { method: 'HEAD', mode: 'cors' });
    const len = resp.headers.get('content-length');
    return len ? Number(len) : 0;
  } catch {
    return 0;
  }
}

async function downloadWithProgress(
  url: string,
  cache: Cache,
  report: (bytes: number) => void,
  size: number,
): Promise<boolean> {
  try {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new TypeError(`status ${resp.status}`);
    const lenHeader = resp.headers.get('content-length');
    const len = lenHeader ? Number(lenHeader) : size;
    const stream = resp.body ? resp.body.getReader() : null;
    if (!stream || !len) {
      await cache.put(url, resp.clone());
      report(len || size);
      return true;
    }
    const chunks: Uint8Array[] = [];
    let received = 0;
    // Read the stream exactly once and reassemble for cache.put.
    for (;;) {
      const { done: finished, value } = await stream.read();
      if (finished) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        report(Math.min(received, len));
      }
    }
    const blob = new Blob(chunks as BlobPart[]);
    await cache.put(url, new Response(blob, { headers: resp.headers }));
    report(len);
    return true;
  } catch {
    report(0);
    return false; // caller falls back to the plain (no progress) path
  }
}
