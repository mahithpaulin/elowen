import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SPEAKING_EXERCISES } from '../data/labExercises';
import { getSnapshot, saveSpeaking } from '../storage/appstore';
import { analyseAudio, summariseDuration } from '../engines/audio/audio';
import { compareReference } from '../engines/textdiff';
import { asr, describeSpeechEngineAvailability } from '../engines/recognizers/asr';
import { Button, Card, Badge, Eyebrow, Stat, Callout, EmptyState, Progress } from '../components/ui';
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
  // One take has one session id. Transcription updates that session; it does
  // not create a second one (which would double the recorded work).
  const sessionId = useRef<string | null>(null);

  // Poll the engine status object (it is mutated by the adapter). The poll
  // re-renders this page every 500 ms — which used to tear the recorder down
  // mid-take, because the recorder's effect depended on the callbacks below.
  useEffect(() => {
    const t = setInterval(() => setAsrStatus({ ...asr.status }), 500);
    return () => clearInterval(t);
  }, []);

  const onDone = useCallback((s: Float32Array, sr: number) => {
    setSamples(s);
    setSampleRate(sr);
    setPhase('done');
    const first = analyseAudio(s, sr, null);
    setReport(first);
    const id = uid();
    sessionId.current = id;
    void saveSpeaking({
      id,
      ts: Date.now(),
      exerciseRef: ex.id,
      transcript: null,
      similarity: null,
      report: first,
      asrEngine: null,
    });
  }, [ex.id]);

  const onAbort = useCallback(() => {
    setPhase('idle');
  }, []);

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
        id: sessionId.current ?? uid(),
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
          <select
            value={exId}
            disabled={phase === 'recording'}
            onChange={(e) => {
              setExId(e.target.value);
              // A finished take belongs to the task it was spoken against;
              // switching tasks must not keep stale audio/transcript on screen.
              setSamples(null);
              setReport(null);
              setTranscript(null);
              setPhase('idle');
              sessionId.current = null;
            }}
            style={selectStyle}
          >
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
            <Recorder onDone={onDone} onAbort={onAbort} />
          ) : (
            <div className="row">
              <Button
                primary
                onClick={() => {
                  setPhase('recording');
                  setReport(null);
                  setTranscript(null);
                  setSamples(null);
                }}
              >
                {phase === 'done' ? '● Record again' : '● Record'}
              </Button>
              {phase === 'done' ? (
                <span className="tiny">Tip: one breath per sentence.</span>
              ) : null}
            </div>
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

/**
 * Records one take.
 *
 * The callbacks are held in refs so the capture effect runs exactly once. The
 * previous version listed them as effect dependencies: the page re-renders
 * every 500 ms (the speech-engine status poll), which changed the callback
 * identity, which tore down the effect — stopping the microphone half a
 * second into every recording. The stop button was also wired with a raw
 * DOM listener that only existed after the microphone permission resolved, so
 * an early tap on "Stop" did nothing at all.
 */
function Recorder({ onDone, onAbort }: { onDone: (s: Float32Array, sr: number) => void; onAbort: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const stopRef = useRef<(() => void) | null>(null);
  const stopRequested = useRef(false);
  const doneRef = useRef(onDone);
  const abortRef = useRef(onAbort);
  doneRef.current = onDone;
  abortRef.current = onAbort;

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let raf = 0;

    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const ctx = new AudioContext();
        await ctx.resume().catch(() => undefined);
        const sr = ctx.sampleRate;
        const buf: number[] = [];
        const processor = ctx.createScriptProcessor(2048, 1, 1);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const levels = new Float32Array(analyser.fftSize);
        const tick = () => {
          analyser.getFloatTimeDomainData(levels);
          let sum = 0;
          for (let i = 0; i < levels.length; i++) sum += levels[i]! * levels[i]!;
          setLevel(Math.min(1, Math.sqrt(sum / levels.length) * 6));
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        processor.onaudioprocess = (ev) => {
          const d = ev.inputBuffer.getChannelData(0);
          for (let i = 0; i < d.length; i++) buf.push(d[i]);
          setElapsed((e) => e + d.length / sr);
        };
        source.connect(processor);
        // sink so the processor actually runs; muted output is fine
        const gain = ctx.createGain();
        gain.gain.value = 0;
        processor.connect(gain);
        gain.connect(ctx.destination);

        let stopped = false;
        const stop = () => {
          if (stopped) return;
          stopped = true;
          if (buf.length === 0) {
            setErr('No audio received — check the microphone permission.');
            abortRef.current();
          } else {
            const merged = new Float32Array(buf.length);
            merged.set(buf);
            doneRef.current(merged, sr);
          }
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
        };
        stopRef.current = stop;
        // A tap on Stop that landed while the permission prompt was still open
        // must not be lost.
        if (stopRequested.current) {
          stopRequested.current = false;
          stop();
        }

        cleanup = () => {
          stopped = true;
          stream.getTracks().forEach((t) => t.stop());
          void ctx.close();
        };
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
          abortRef.current();
        }
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      cleanup?.();
      stopRef.current = null;
    };
  }, []);

  return (
    <div>
      <div className="row" style={{ gap: 10 }}>
        <button
          className="btn recording"
          onClick={() => {
            if (stopRef.current) stopRef.current();
            else stopRequested.current = true;
          }}
        >
          {stopRef.current ? '■ Stop' : '… starting'} — {summariseDuration(elapsed)}
        </button>
        <div className="levelmeter" aria-label="Input level">
          <span style={{ width: `${Math.round(level * 100)}%` }} />
        </div>
      </div>
      <p className="tiny" style={{ marginTop: 8 }}>
        Nothing is uploaded; audio lives only in this page. Tap stop when you finish the
        sentence.
      </p>
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
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
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
          <p className="tiny" style={{ marginTop: 6 }}>
            {comparison.matched} matched · {comparison.missing} missed or wrong · {comparison.extra}{' '}
            extra
          </p>
          <Progress value={comparison.similarity * 100} />
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
        Missed words are struck through. Extra words lower the score too — the same
        deterministic alignment the reading tool uses.
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
