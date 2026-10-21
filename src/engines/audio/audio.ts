/**
 * Deterministic audio analysis for speaking practice.
 * Input: mono Float32 PCM in [-1, 1] plus sample rate.
 *
 * The analyser: 10 ms hop, 30 ms RMS window, hysteresis VAD.
 * Everything is computed from the signal only — no "AI heard a mistake".
 */

import { clamp, percentile } from '../../utils';
import type { AudioReport } from '../../types';

const HOP_S = 0.01;
const WIN_S = 0.03;

function dbfs(x: number): number {
  const v = Math.max(1e-9, Math.abs(x));
  return Math.max(-96, 20 * Math.log10(v));
}

export interface SegMask {
  frames: Uint8Array; // 1 = speech
  hop: number;
}

/** Voice activity by energy threshold with hysteresis. */
export function vad(samples: Float32Array, sampleRate: number): SegMask {
  const hop = Math.max(1, Math.round(sampleRate * HOP_S));
  const win = Math.max(hop, Math.round(sampleRate * WIN_S));
  const frames = Math.max(1, Math.floor(samples.length / hop));
  const energy = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    const start = f * hop;
    const end = Math.min(samples.length, start + win);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    energy[f] = Math.sqrt(sum / Math.max(1, end - start));
  }
  const dB = Array.from(energy, dbfs);
  const noiseFloor = percentile(dB, 0.15);
  const enterThreshold = Math.max(-46, noiseFloor + 10);
  const exitThreshold = enterThreshold - 4;
  const mask = new Uint8Array(frames);
  let run = 0;
  let inSpeech = 0;
  let below = 0;
  for (let f = 0; f < frames; f++) {
    const d = dB[f];
    if (d >= enterThreshold) {
      run++;
      if (run >= 3) inSpeech = 1;
    } else {
      run = 0;
    }
    if (inSpeech) {
      if (d < exitThreshold) below++;
      else below = 0;
      if (below > 6) inSpeech = 0; // ≥60ms of quiet ends the segment
      else mask[f] = 1;
    }
  }
  return { frames: mask, hop };
}

export interface Segments {
  speechS: number;
  silenceS: number;
  pauseCount: number;
  wave: number[];
}

export function describeActivity(mask: SegMask, samples: Float32Array, sampleRate: number, waveBuckets = 96): Segments {
  const hopS = mask.hop / sampleRate;
  let speech = 0;
  for (let i = 0; i < mask.frames.length; i++) speech += mask.frames[i];
  const speechS = speech * hopS;
  const totalS = samples.length / sampleRate;
  // pause count: gaps ≥250 ms between speech
  let pauseCount = 0;
  let gap = 0;
  let ended = 0;
  for (let i = 0; i < mask.frames.length; i++) {
    if (mask.frames[i]) {
      if (gap * hopS >= 0.25) pauseCount++;
      gap = 0;
      ended = i;
    } else {
      gap++;
    }
  }
  void ended;
  // envelope for the UI waveform
  const wave: number[] = new Array(waveBuckets).fill(0);
  const per = Math.max(1, Math.floor(samples.length / waveBuckets));
  for (let b = 0; b < waveBuckets; b++) {
    const start = b * per;
    const end = Math.min(samples.length, start + per);
    let peak = 0;
    for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
    wave[b] = clamp(peak / 0.35, 0, 1);
  }
  return { speechS, silenceS: Math.max(0, totalS - speechS), pauseCount, wave };
}

export function analyseAudio(samples: Float32Array, sampleRate: number, transcriptWordCount: number | null = null): AudioReport {
  const durationS = samples.length / sampleRate;
  const warnings: string[] = [];
  let peak = 0;
  let clip = 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
    if (v >= 0.98) clip++;
    sumSq += samples[i] * samples[i];
  }
  const rms = durationS > 0 ? Math.sqrt(sumSq / samples.length) : 0;
  const rmsDbfs = dbfs(rms);
  const peakDbfs = dbfs(peak);
  const clipRatio = samples.length ? clip / samples.length : 0;

  if (durationS < 0.8) warnings.push('Recording is shorter than 0.8 s — try to record a full attempt.');
  if (peakDbfs < -30) warnings.push('The recording is very quiet. Move the microphone closer.');
  if (clipRatio > 0.008) warnings.push('The recording is clipping (too loud). Turn the input down.');
  if (rmsDbfs < -45) warnings.push('Almost no signal detected. Check microphone permissions and try again.');

  const mask = vad(samples, sampleRate);
  const act = describeActivity(mask, samples, sampleRate);
  if (act.speechS < 0.2) warnings.push('No speech detected — the clip may be silent.');

  let speechRate: number | null = null;
  if (transcriptWordCount != null && act.speechS > 0.3 && transcriptWordCount > 0) {
    speechRate = transcriptWordCount / act.speechS;
  }

  const report: AudioReport = {
    durationS: Math.round(durationS * 100) / 100,
    speechS: Math.round(act.speechS * 100) / 100,
    silenceS: Math.round(act.silenceS * 100) / 100,
    pauseCount: act.pauseCount,
    rmsDbfs: Math.round(rmsDbfs * 10) / 10,
    peakDbfs: Math.round(peakDbfs * 10) / 10,
    clipRatio: Math.round(clipRatio * 10000) / 10000,
    speechRate: speechRate == null ? null : Math.round(speechRate * 100) / 100,
    warnings,
    wave: act.wave,
  };
  if (report.speechRate != null && report.speechRate > 6.5) {
    warnings.push('The estimated speaking rate is very high — check the transcript.');
  }
  return report;
}

/** Split total duration into a human summary. */
export function summariseDuration(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export const EMPTY_REPORT: AudioReport = {
  durationS: 0,
  speechS: 0,
  silenceS: 0,
  pauseCount: 0,
  rmsDbfs: -100,
  peakDbfs: -100,
  clipRatio: 0,
  speechRate: null,
  warnings: [],
  wave: [],
};
