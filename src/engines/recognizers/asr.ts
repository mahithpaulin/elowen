/**
 * Speech recognition adapter.
 *
 * Evaluation (2026-10-21):
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
 */

const VOSK_ESM_URLS = [
  'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/dist/vosk-browser.esm.js',
  'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.7/lib/vosk.js',
];
export const VOSK_MODEL_URL =
  'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz';

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
  acceptWaveform(samples: Float32Array): void;
  result(): { text?: string };
  finalResult(): { text?: string };
}

interface VoskModelLike {
  KaldiRecognizer: new (sampleRate: number, words?: unknown) => VoskRecognizerLike;
  setWords?(on: boolean): void;
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
      if (!mod) throw new Error('The vosk-browser module is not available from this network.');
      this.module = mod;
      this.status = { state: 'loading', message: 'Downloading the English model (~40 MB, first time only)…' };
      const model = await mod.createModel(VOSK_MODEL_URL);
      model.setWords?.(false);
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

  transcribe(samples: Float32Array, sampleRate: number): Promise<Speech> {
    if (this.status.state !== 'ready' || !this.model) {
      return Promise.reject(new Error('The speech engine is not ready.'));
    }
    const rec = new this.model.KaldiRecognizer(sampleRate);
    return new Promise((resolve) => {
      const shaped = new Float32Array(samples);
      rec.acceptWaveform(shaped);
      const fin = rec.finalResult();
      const text = (fin.text ?? '').trim();
      resolve({ transcript: text, confidence: null });
    });
  }
}

async function loadVoskModule(): Promise<VoskModule | null> {
  for (const url of VOSK_ESM_URLS) {
    try {
      const mod = (await import(/* @vite-ignore */ url)) as Partial<VoskModule> & {
        createModel?: VoskModule['createModel'];
        default?: { createModel: VoskModule['createModel'] };
      };
      const createModel =
        typeof mod.createModel === 'function' ? mod.createModel : mod.default?.createModel;
      if (createModel) return { createModel };
    } catch {
      // try the next URL
    }
  }
  return null;
}

function friendly(raw: string): string {
  if (/fetch/i.test(raw) || /network/i.test(raw)) {
    return 'Needs a one-time ~40 MB download. Connect and retry — nothing leaves the device after that.';
  }
  if (/memory|OOM|abort/i.test(raw)) {
    return 'The model did not fit in memory on this device.';
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
