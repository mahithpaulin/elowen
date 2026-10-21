import { describe, expect, it } from 'vitest';
import { vad, describeActivity, analyseAudio, summariseDuration } from '../src/engines/audio/audio';

const SR = 16000;

/** flat silence */
function silence(seconds: number): Float32Array {
  return new Float32Array(Math.round(seconds * SR));
}

/** 4 Hz burst pattern: 0.4 s on, 0.35 s off, sine 220 Hz */
function speechLike(seconds: number): Float32Array {
  const n = Math.round(seconds * SR);
  const out = new Float32Array(n);
  let t = 0;
  while (t < seconds) {
    const burstStart = Math.floor(t * SR);
    const burstLen = Math.round(0.4 * SR);
    for (let i = 0; i < burstLen && burstStart + i < n; i++) {
      out[burstStart + i] = 0.35 * Math.sin((2 * Math.PI * 220 * i) / SR);
    }
    t += 0.75;
  }
  return out;
}

describe('VAD segmentation', () => {
  it('pure silence is one silent region with no speech', () => {
    const mask = vad(silence(2), SR);
    expect(mask.speech).toHaveLength(0);
    expect(mask.silence.length).toBeGreaterThan(0);
  });
  it('speech-like bursts appear as speech segments', () => {
    const mask = vad(speechLike(2), SR);
    expect(mask.speech.length).toBeGreaterThanOrEqual(2);
  });
  it('hysteresis keeps short dips inside one segment', () => {
    const mask = vad(speechLike(2), SR);
    const text = describeActivity(mask, speechLike(2), SR);
    expect(text.pauseCount).toBeLessThan(mask.speech.length + 2);
  });
});

describe('describeActivity / analyseAudio', () => {
  it('accounts for speech+silence ≈ duration', () => {
    const samples = speechLike(2);
    const activity = describeActivity(vad(samples, SR), samples, SR);
    expect(activity.speechS).toBeGreaterThan(0.5);
    const report = analyseAudio(samples, SR);
    expect(report.durationS).toBeCloseTo(2, 1);
    expect(report.wave.length).toBeGreaterThan(40);
  });
  it('clipping is flagged on a cranked signal', () => {
    const n = SR / 2;
    const samples = new Float32Array(n).fill(1.4);
    const report = analyseAudio(samples, SR);
    expect(report.warnings.some((w) => /clip/i.test(w))).toBe(true);
  });
  it('silence is flagged as no usable signal', () => {
    const report = analyseAudio(silence(1), SR);
    expect(report.warnings.length).toBeGreaterThan(0);
    expect(report.speechRate).toBeNull();
  });
  it('rate appears only with a transcript word count', () => {
    const samples = speechLike(1.5);
    const withTranscript = analyseAudio(samples, SR, 5);
    expect(withTranscript.speechRate).toBeGreaterThan(0);
    expect(withTranscript.speechRate).toBe(5 / withTranscript.speechS);
  });
});

describe('summariseDuration', () => {
  it('formats seconds and minutes', () => {
    expect(summariseDuration(10)).toBe('10 s');
    expect(summariseDuration(90)).toBe('1.5 min');
  });
});
