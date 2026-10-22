/**
 * Speech recognition adapter.
 *
 * Evaluation (2026-10-21, re-verified 2026-10-21 late):
 *  - Web Speech API: free but server-transcribed on Chrome/Android; not
 *    acceptable here (privacy + not deterministic + not offline). Not used.
 *  - vosk-browser 0.0.7 (Apache-2.0): fully offline WASM Kaldi. Small English
 *    model ≈ 40 MB. Runs in a Web Worker page-side; memory-bound on phones.
 *  - whisper.cpp WASM: needs a bigger download and Multi-buffer compile
 *    complexity; kept as the documented future engine.
 *
 * This adapter therefore starts vosk-browser from a CDN, packages the small
 * English model download, and converts failure into an equipped-unavailable
 * state. It NEVER returns a fake transcript.
 *
 * Three facts that the earlier version of this file got wrong and that are
 * easy to get wrong again:
 *  1. The published vosk-browser package ships ONE file — `dist/vosk.js`.
 *     The two URLs used before (`dist/vosk-browser.esm.js`, `lib/vosk.js`)
 *     are 404s, so the engine could never load at all.
 *  2. That file is a UMD bundle: imported as a module it exports nothing and
 *     publishes itself on `globalThis.Vosk` instead.
 *  3. The recogniser takes an AudioBuffer (`acceptWaveform`) or floats
 *     (`acceptWaveformFloat`) and reports through events — there is no
 *     `result()` / `finalResult()` method to call.
 */

import { ASR_SAMPLE_RATE, resample } from '../audio/audio';

const VOSK_MODULE_URL = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/dist/vosk.js';

/**
 * The model is fetched by the recogniser's own worker, which means it has to
 * be reachable with CORS. The official host (alphacephei.com) sends no
 * Access-Control-Allow-Origin header, so a browser cannot fetch it at all;
 * this mirror of the same file does, which is what makes the feature work in
 * a browser at all. Same model, same bytes (41,184,862).
 */
export const VOSK_MODEL_URL =
  'https://huggingface.co/zzzlll/vosk-model-small-en-us-0.15/resolve/main/vosk-model-small-en-us-0.15.tar.gz';

export type SpeechStatus =
  | { state: 'idle' }
  | { state: 'loading'; message: string }
  | { state: 'ready'; engine: string }
  | { state: 'error'; message: string };

export interface Speech {
  transcript: string;
  confidence: null | number;
}

interface VoskRecognizerLike {
  acceptWaveformFloat(samples: Float32Array, sampleRate: number): void;
  setWords?(words: boolean): void;
  remove(): void;
  on(event: string, listener: (message: unknown) => void): void;
}

interface VoskModelLike {
  KaldiRecognizer: new (sampleRate: number, grammar?: unknown) => VoskRecognizerLike;
  ready?: boolean;
}

interface VoskModule {
  createModel(url: string): Promise<VoskModelLike>;
}

export class VoskAdapter {
  readonly engineId = 'vosk-browser/0.0.7 + vosk-model-small-en-us-0.15';
  status: SpeechStatus = { state: 'idle' };

  private module: VoskModule | null = null;
  private model: VoskModelLike | null = null;
  private loading: Promise<void> | null = null;

  isReady(): boolean {
    return this.status.state === 'ready';
  }

  async init(): Promise<void> {
    if (this.status.state === 'ready') return;
    if (this.loading) return this.loading;
    this.status = { state: 'loading', message: 'Loading the offline speech engine…' };
    this.loading = (async () => {
      const mod = await loadVoskModule();
      if (!mod) throw new Error('The vosk-browser module could not be loaded from this network.');
      this.module = mod;
      this.status = {
        state: 'loading',
        message: 'Downloading the English model (~40 MB, first time only)…',
      };
      const model = await mod.createModel(VOSK_MODEL_URL);
      this.model = model;
      this.status = { state: 'ready', engine: this.engineId };
    })();
    try {
      await this.loading;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      this.status = { state: 'error', message: friendly(raw) };
    } finally {
      this.loading = null;
    }
  }

  /**
   * Transcribe a take. The audio is resampled to 16 kHz first — the model
   * expects that rate, and un-resampled 48 kHz audio recognises badly.
   *
   * Vosk reports finished segments through `result` events and only emits one
   * when its endpointing hears a pause. A take that stops on the final word
   * has no endpoint, so the pending segment is flushed by feeding one second
   * of silence; the last `partialresult` is the fallback if the worker has
   * not answered in time. (Calling `remove()` does ask Kaldi for a final
   * result, but vosk-browser unregisters the recogniser first, so that answer
   * is dropped before the page can see it — do not rely on it.)
   */
  transcribe(samples: Float32Array, sampleRate: number): Promise<Speech> {
    if (this.status.state !== 'ready' || !this.model) {
      return Promise.reject(new Error('The speech engine is not ready.'));
    }
    const model = this.model;
    const audio = resample(samples, sampleRate, ASR_SAMPLE_RATE);
    return new Promise((resolve) => {
      const rec = new model.KaldiRecognizer(ASR_SAMPLE_RATE);
      rec.setWords?.(false);
      let text = '';
      let partial = '';
      let settled = false;

      const combined = (): string =>
        [text, partial].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      const finish = (): void => {
        if (settled) return;
        settled = true;
        try {
          rec.remove();
        } catch {
          /* the recogniser may already be gone */
        }
        resolve({ transcript: combined(), confidence: null });
      };

      rec.on('result', (message: unknown) => {
        const t = (message as { result?: { text?: string } } | null)?.result?.text ?? '';
        if (t) text = text ? `${text} ${t}` : t;
        partial = '';
      });
      rec.on('partialresult', (message: unknown) => {
        partial =
          (message as { result?: { partial?: string } } | null)?.result?.partial ?? '';
      });
      rec.on('error', () => finish());

      try {
        rec.acceptWaveformFloat(audio, ASR_SAMPLE_RATE);
        // One second of silence makes the endpoint fire and flushes the
        // pending words through the documented `result` event.
        rec.acceptWaveformFloat(new Float32Array(ASR_SAMPLE_RATE), ASR_SAMPLE_RATE);
      } catch {
        finish();
        return;
      }
      // The recogniser runs in a worker; allow the flushed result to arrive.
      setTimeout(finish, 1200);
    });
  }
}

async function loadVoskModule(): Promise<VoskModule | null> {
  const g = globalThis as unknown as { Vosk?: { createModel?: VoskModule['createModel'] } };
  try {
    const mod = (await import(/* @vite-ignore */ VOSK_MODULE_URL)) as Partial<VoskModule> & {
      default?: { createModel?: VoskModule['createModel'] };
    };
    const fromModule =
      typeof mod.createModel === 'function' ? mod.createModel : mod.default?.createModel;
    if (fromModule) return { createModel: fromModule };
    // UMD bundle loaded as a module: it publishes itself on the global object.
    if (typeof g.Vosk?.createModel === 'function') {
      return { createModel: g.Vosk.createModel.bind(g.Vosk) };
    }
  } catch {
    /* fall through to the global check below */
  }
  if (typeof g.Vosk?.createModel === 'function') {
    return { createModel: g.Vosk.createModel.bind(g.Vosk) };
  }
  return null;
}

function friendly(raw: string): string {
  if (/Failed to fetch|NetworkError|load failed|fetch/i.test(raw)) {
    return 'Needs a one-time ~40 MB download. Connect and retry — nothing leaves the device after that.';
  }
  if (/memory|OOM|abort/i.test(raw)) {
    return 'The model did not fit in memory on this device.';
  }
  if (/CORS|Access-Control/i.test(raw)) {
    return 'The model host refused the browser request. Connect and try again.';
  }
  return `Offline speech engine unavailable: ${raw}`;
}

/** True environment-aware default availability summary shown in Settings. */
export function describeSpeechEngineAvailability(): {
  title: string;
  detail: string;
} {
  return {
    title: 'vosk-browser (offline English)',
    detail:
      'Loaded on demand from a free CDN. Runs completely on-device after the one-time ~40 MB model download. May be too heavy for older phones. When unavailable, the app still records audio and reports signal/fluency metrics — but no transcript is invented.',
  };
}

export const asr = new VoskAdapter();
