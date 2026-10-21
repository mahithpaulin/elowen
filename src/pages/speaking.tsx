import { useEffect, useMemo, useRef, useState } from 'react';
import { SPEAKING_EXERCISES } from '../data/labExercises';
import { getSnapshot, saveSpeaking } from '../storage/appstore';
import { analyseAudio, summariseDuration } from '../engines/audio/audio';
import { compareReference } from '../engines/textdiff';
import { asr, describeSpeechEngineAvailability } from '../engines/recognizers/asr';
import { Button, Card, Badge, Eyebrow, Stat, Callout, EmptyState } from '../components/ui';
import { uid } from '../utils';
import type { AudioReport } from '../types';

/** Speaking Lab: record, analyse audio locally, optional offline transcript. */
export function SpeakingPage() {
  const [exId, setExId] = useState(SPEAKING_EXERCISES[0]!.id);
  const ex = useMemo(() => SPEAKING_EXERCISES.find((e) => e.id === exId)!, [exId]);
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  const [samples, setSamples] = useState<Float32Array | null>(null);
  const [sampleRate, setSampleRate] = useState(48000);
  const [report, setReport] = useState<AudioReport | null>(null);
  const [asrStatus, setAsrStatus] = useState(asr.status);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // poll the engine status object (it is mutated by the adapter)
  useEffect(() => {
    const t = setInterval(() => setAsrStatus({ ...asr.status }), 500);
    return () => clearInterval(t);
  }, []);

  const onDone = (s: Float32Array, sr: number) => {
    setSamples(s);
    setSampleRate(sr);
    setPhase('done');
    const first = analyseAudio(s, sr, null);
    setReport(first);
    void saveSpeaking({
      id: uid(),
      ts: Date.now(),
      exerciseRef: ex.id,
      transcript: null,
      similarity: null,
      report: first,
    });
  };

  const onTranscribe = async () => {
    if (!samples) return;
    setBusy(true);
    try {
      const speech = await asr.transcribe(samples, sampleRate);
      const text = speech.transcript.trim();
      setTranscript(text);
      const report2 = analyseAudio(samples, sampleRate, text ? text.split(/\s+/).length : null);
      setReport(report2);
      const sim = text ? compareReference(ex.target, text).similarity : null;
      await saveSpeaking({
        id: uid(),
        ts: Date.now(),
        exerciseRef: ex.id,
        transcript: text || null,
        similarity: sim,
        report: report2,
        asrEngine: asr.engineId,
      });
    } catch (e) {
      window.alert(`Transcription failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Speaking Lab</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Recording and analysis stay on this device. An offline recogniser is optional and
        clearly labelled when unavailable — no transcript is ever invented.
      </p>

      <div className="grid2">
        <Card>
          <Eyebrow>Pick a practice task</Eyebrow>
          <select value={exId} onChange={(e) => setExId(e.target.value)} style={selectStyle}>
            {SPEAKING_EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} — {e.level}
              </option>
            ))}
          </select>
          <blockquote className="quote" style={{ fontFamily: 'var(--font)', fontSize: '1.18rem' }}>
            {ex.target}
          </blockquote>
          <p className="tiny">Focus: {ex.focus}</p>

          {phase === 'recording' ? (
            <Recorder
              onDone={onDone}
              onAbort={() => setPhase('idle')}
            />
          ) : (
            <Button
              primary
              onClick={() => {
                setPhase('recording');
                setReport(null);
                setTranscript(null);
                setSamples(null);
              }}
            >
              {phase === 'done' ? 'Record again' : 'Record'}
            </Button>
          )}
        </Card>

        <Card>
          <Eyebrow>Local audio metrics</Eyebrow>
          {phase === 'recording' ? <p className="tiny">Listening… speak, then press stop.</p> : null}
          {!report && phase !== 'recording' ? (
            <EmptyState title="No recording yet" note="Press record, speak the target, then stop. Metrics appear here." />
          ) : null}
          {report ? (
            <>
              <WaveBox wave={report.wave} />
              <div className="grid2" style={{ gap: 8, marginTop: 10 }}>
                <Stat num={summariseDuration(report.speechS)} lbl="spoken time" />
                <Stat num={summariseDuration(report.silenceS)} lbl="silence" />
                <Stat num={String(report.pauseCount)} lbl="pauses ≥ 0.25 s" />
                <Stat num={`${Math.round(report.rmsDbfs)} dB`} lbl="level" />
              </div>
              {report.warnings.length > 0 ? <div className="feedback bad">{report.warnings.join(' ')}</div> : null}
              {samples ? (
                <details style={{ marginTop: 10 }}>
                  <summary className="tiny">Play back the recording</summary>
                  <Playback samples={samples} sampleRate={sampleRate} />
                </details>
              ) : null}
              <Callout>
                {report.speechRate != null
                  ? `Rate ≈ ${report.speechRate.toFixed(2)} words/sec (from ${transcript?.split(/\s+/).length ?? 0} recognised words).`
                  : 'Speech rate needs a transcript. Audio metrics above still work without one.'}
              </Callout>
            </>
          ) : null}
        </Card>
      </div>

      {samples && report ? (
        <Card>
          <Eyebrow>Optional: offline word check</Eyebrow>
          <p className="tiny">{describeSpeechEngineAvailability().detail}</p>
          {asrStatus.state === 'ready' ? (
            <Button primary disabled={busy} onClick={() => void onTranscribe()}>
              {busy ? 'Working…' : 'Transcribe & score against the target'}
            </Button>
          ) : asrStatus.state === 'loading' ? (
            <p className="tiny">{asrStatus.message}</p>
          ) : asrStatus.state === 'error' ? (
            <div className="feedback bad">{asrStatus.message}</div>
          ) : (
            <Button
              onClick={() => {
                void asr.init();
              }}
            >
              Download & start the offline engine (one-time ~40 MB)
            </Button>
          )}

          {transcript != null ? (
            <TranscriptBox transcript={transcript} target={ex.target} />
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

/* ------------------------------- recorder ------------------------------- */

let sharedAudioState: {
  ctx: AudioContext | null;
  stream: MediaStream | null;
  buf: number[];
} | null = null;

function Recorder({ onDone, onAbort }: { onDone: (s: Float32Array, sr: number) => void; onAbort: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        const sr = ctx.sampleRate;
        const buf: number[] = [];
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        processor.onaudioprocess = (ev) => {
          const d = ev.inputBuffer.getChannelData(0);
          for (let i = 0; i < d.length; i++) buf.push(d[i]);
          setElapsed((e) => e + d.length / sr);
        };
        ctx.createMediaStreamSource(stream).connect(processor);
        // sink so the processor actually runs; muted output is fine
        processor.connect(ctx.destination);
        sharedAudioState = { ctx, stream, buf };
        const stop = () => {
          if (buf.length === 0) {
            setErr('No audio received — check the microphone permission.');
            onAbort();
          } else {
            const merged = new Float32Array(buf.length);
            merged.set(buf);
            onDone(merged, sr);
          }
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
          sharedAudioState = null;
        };
        document.getElementById('stop-recording')?.addEventListener('click', stop, { once: true });
      } catch (e) {
        setErr(e instanceof Error ? e.message : String(e));
        onAbort();
      }
    })();
    return () => {
      cancelled = true;
      sharedAudioState?.stream?.getTracks().forEach((t) => t.stop());
      void sharedAudioState?.ctx?.close();
      sharedAudioState = null;
    };
  }, [onDone, onAbort]);

  return (
    <div>
      <button className="btn primary" id="stop-recording">
        ■ Stop — {summariseDuration(elapsed)}
      </button>
      <p className="tiny">Nothing is uploaded; audio lives only in this page.</p>
      {err ? <div className="feedback bad">Microphone: {err}</div> : null}
    </div>
  );
}

/* -------------------------------- widgets -------------------------------- */

function WaveBox({ wave }: { wave: number[] }) {
  return (
    <svg viewBox={`0 0 ${wave.length * 4} 60`} style={{ width: '100%', background: 'var(--sage)', borderRadius: 8 }} role="img" aria-label="Your speech envelope">
      {wave.map((v, i) => {
        const h = Math.max(2, v * 56);
        return <rect key={i} x={i * 4 + 1} y={(60 - h) / 2} width={2.4} height={h} rx={1.2} fill="var(--forest)" />;
      })}
    </svg>
  );
}

function Playback({ samples, sampleRate }: { samples: Float32Array; sampleRate: number }) {
  const url = useMemo(() => {
    const wav = float32ToWav(samples, sampleRate);
    return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  }, [samples, sampleRate]);
  return <audio controls src={url} style={{ width: '100%', marginTop: 8 }} />;
}

function TranscriptBox({ transcript, target }: { transcript: string; target: string }) {
  const comparison = compareReference(target, transcript);
  return (
    <div>
      <div className="grid2" style={{ gap: 12 }}>
        <div>
          <Eyebrow>Target</Eyebrow>
          <p style={{ fontFamily: 'var(--font)' }}>{target}</p>
          <Eyebrow>Recognised</Eyebrow>
          <p style={{ fontFamily: 'var(--font)' }}>{transcript || '(nothing recognised)'}</p>
        </div>
        <div>
          <Badge tone={comparison.similarity >= 0.72 ? 'ok' : 'copper'}>
            word match {Math.round(comparison.similarity * 100)}%
          </Badge>
          <div className="diff">
            {comparison.tokens.map((t, i) => (
              <span key={i} className={`tok ${t.kind}`}>
                {t.kind === 'del' ? (t.reference ?? '') : (t.produced ?? '')}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        Missed words are struck through. This score uses the same deterministic alignment as the reading tool.
      </p>
    </div>
  );
}

/* -------------------------------- utils -------------------------------- */

function float32ToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  w(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]!));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

const selectStyle: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#fffef9',
  color: 'var(--ink)',
  maxWidth: '100%',
};
