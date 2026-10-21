import { useEffect, useMemo, useRef, useState } from 'react';
import { HANDWRITING_EXERCISES } from '../data/labExercises';
import { getSnapshot, saveHandwriting } from '../storage/appstore';
import {
  rgbaToGray,
  contrastStretch,
  medianDenoise,
  adaptiveThreshold,
  estimateSkew,
  rotate,
  MAX_IMAGE_PIXELS,
  type Gray8,
  type BinImage,
} from '../engines/imageproc/imageproc';
import { qualityFromGray, measure, scoreResult, overallScore } from '../engines/imageproc/analyze';
import { compareReference } from '../engines/textdiff';
import { ocr, wordsFromTess } from '../engines/recognizers/ocr';
import { Button, Card, Badge, Eyebrow, Progress, Callout, EmptyState } from '../components/ui';
import { uid } from '../utils';
import type { AnalyzeOutput, OcrOutcome, OcrWord } from '../types';

type Tab = 'practice' | 'analyze';

/** Handwriting Lab: practice on canvas or analyse an uploaded/camera photo. */
export function HandwritingPage() {
  const [tab, setTab] = useState<Tab>('practice');
  return (
    <>
      <h1>Handwriting Lab</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Deterministic image processing in your browser — normalisation, adaptive
        binarisation, skew estimation, line segmentation and measurable scores. Every
        unmeasurable state is declared, never guessed.
      </p>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button aria-pressed={tab === 'practice'} onClick={() => setTab('practice')}>
          Practise & measure
        </button>
        <button aria-pressed={tab === 'analyze'} onClick={() => setTab('analyze')}>
          Analyse a photo
        </button>
      </div>
      {tab === 'practice' ? <PracticeLab /> : <AnalyzeLab />}
    </>
  );
}

/* ------------------------- practice canvas ------------------------- */

function PracticeLab() {
  const [exId, setExId] = useState(HANDWRITING_EXERCISES[0]!.id);
  const ex = useMemo(() => HANDWRITING_EXERCISES.find((e) => e.id === exId)!, [exId]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);
  const [pen, setPen] = useState(4);
  const [output, setOutput] = useState<AnalyzeOutput | null>(null);
  const [ocrOut, setOcrOut] = useState<OcrOutcome | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    redraw(c, strokes.current, true);
  }, [exId]);

  const pointerPos = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * c.width, y: ((ev.clientY - r.top) / r.height) * c.height };
  };

  return (
    <div className="grid2" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
      <div>
        <Card>
          <Eyebrow>Choose a copy task</Eyebrow>
          <select
            value={exId}
            onChange={(e) => {
              setExId(e.target.value);
              setOutput(null);
              setOcrOut(null);
              strokes.current = [];
            }}
            style={selectStyle}
          >
            {HANDWRITING_EXERCISES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <p style={{ margin: '8px 0 4px', fontFamily: 'var(--font)', fontSize: '1.25rem' }}>{ex.reference}</p>
          <p className="tiny">Focus: {ex.focus}</p>
        </Card>

        <Card className="tight">
          <canvas
            ref={canvasRef}
            width={860}
            height={300}
            style={{ width: '100%', touchAction: 'none', display: 'block' }}
            onPointerDown={(e) => {
              drawing.current = true;
              strokes.current.push([pointerPos(e)]);
              setDirty(true);
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return;
              strokes.current[strokes.current.length - 1]!.push(pointerPos(e));
              const c = canvasRef.current!;
              redraw(c, strokes.current, true);
            }}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
          />
          <div className="row spread" style={{ marginTop: 8 }}>
            <div className="row">
              <label className="tiny">pen</label>
              <select value={pen} onChange={(e) => {
                const w = Number(e.target.value);
                setPen(w);
                if (canvasRef.current) redraw(canvasRef.current, strokes.current, true, w);
              }} style={{ ...selectStyle, maxWidth: 60 }}>
                <option value={2}>thin</option>
                <option value={4}>medium</option>
                <option value={7}>broad</option>
              </select>
            </div>
            <div className="row">
              <Button small onClick={() => {
                strokes.current.pop();
                redraw(canvasRef.current!, strokes.current, true, pen);
              }}>
                Undo stroke
              </Button>
              <Button small onClick={() => {
                strokes.current = [];
                redraw(canvasRef.current!, [], true);
                setDirty(false);
                setOutput(null);
                setOcrOut(null);
              }}>
                Clear
              </Button>
              <Button primary disabled={!dirty || busy} onClick={() => void runMeasure('canvas', ex.id)}>
                Analyse sheet
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div>
        {output ? (
          <ResultsCard
            output={output}
            exerciseRef={ex.reference}
            source="canvas"
            ocrOut={ocrOut}
            busy={busy}
            onRunOcr={() => void runOcr()}
          />
        ) : (
          <Card>
            <EmptyState
              title="Write, then analyse"
              note="Draw the reference above, keep the tablet or phone roughly upright, and tap Analyse sheet. Scores appear locally in a moment."
            />
          </Card>
        )}
      </div>
    </div>
  );

  async function runMeasure(source: 'canvas' | 'upload', exerciseRef: string) {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    try {
      const res = measureCanvas(c);
      setOutput(res.output);
      // persist without OCR
      await saveHandwriting({
        id: uid(),
        ts: Date.now(),
        source: source === 'canvas' ? 'canvas' : 'upload',
        exerciseRef,
        report: res.output,
        transcriptUsed: false,
      });
    } finally {
      setBusy(false);
    }
  }

  async function runOcr() {
    const c = canvasRef.current;
    if (!c) return;
    setBusy(true);
    try {
      await ocr.init(c);
      const words = await ocr.recognize(c);
      const ocrWords: OcrWord[] = wordsFromTess(words);
      const produced = ocrWords.map((w) => w.word).join(' ');
      const comparison = compareReference(ex.reference, produced);
      const out: OcrOutcome = { engine: ocr.engineId, words: ocrWords, comparison };
      setOcrOut(out);
      if (output) {
        const theOutput: AnalyzeOutput = { ...output, ocr: out };
        setOutput(theOutput);
        await saveHandwriting({
          id: uid(),
          ts: Date.now(),
          source: 'canvas',
          exerciseRef: ex.id,
          report: theOutput,
          transcriptUsed: true,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`OCR could not start: ${msg}`); // explicit failure, never silent
    } finally {
      setBusy(false);
    }
  }
}

/* --------------------------- photo analyse --------------------------- */

function AnalyzeLab() {
  const [output, setOutput] = useState<AnalyzeOutput | null>(null);
  const [refId, setRefId] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ocrOut, setOcrOut] = useState<OcrOutcome | null>(null);
  const holdCanvas = useRef<HTMLCanvasElement>(document.createElement('canvas'));

  const runOcr = async () => {
    const ref = HANDWRITING_EXERCISES.find((e) => e.id === refId);
    if (!ref) return;
    setBusy(true);
    try {
      await ocr.init(holdCanvas.current);
      const words = await ocr.recognize(holdCanvas.current);
      const ocrWords: OcrWord[] = wordsFromTess(words);
      const produced = ocrWords.map((w) => w.word).join(' ');
      const out: OcrOutcome = { engine: ocr.engineId, words: ocrWords, comparison: compareReference(ref.reference, produced) };
      setOcrOut(out);
      if (output) {
        const merged: AnalyzeOutput = { ...output, ocr: out };
        setOutput(merged);
        await saveHandwriting({
          id: uid(),
          ts: Date.now(),
          source: 'upload',
          exerciseRef: ref.id,
          report: merged,
          transcriptUsed: true,
        });
      }
    } catch (e) {
      window.alert(`OCR could not start: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File) => {
    setErr(null);
    setBusy(true);
    setOcrOut(null);
    try {
      const img = await loadImageFromUrl(URL.createObjectURL(file));
      const scale = Math.min(1, Math.sqrt(MAX_IMAGE_PIXELS / (img.width * img.height)));
      const c = holdCanvas.current;
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const res = measureCanvas(c);
      setOutput(res.output);
      const thumb = document.createElement('canvas');
      const s = Math.min(1, 320 / Math.max(c.width, 1));
      thumb.width = Math.max(1, Math.round(c.width * s));
      thumb.height = Math.max(1, Math.round(c.height * s));
      thumb.getContext('2d')!.drawImage(img, 0, 0, thumb.width, thumb.height);
      setPreview(thumb.toDataURL('image/png'));
      await saveHandwriting({
        id: uid(),
        ts: Date.now(),
        source: 'upload' as const,
        exerciseRef: refId || undefined,
        report: res.output,
        transcriptUsed: false,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid2" style={{ gridTemplateColumns: '0.9fr 1.1fr' }}>
      <Card>
        <Eyebrow>Load a handwriting photo</Eyebrow>
        <p className="tiny">
          Use good, even light. The app never uploads your image — all processing happens in
          this tab.
        </p>
        <label className="btn primary block" style={{ justifyContent: 'center' }}>
          Choose photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </label>
        <select value={refId} onChange={(e) => setRefId(e.target.value)} style={{ ...selectStyle, marginTop: 10 }}>
          <option value="">Optional: link a copy exercise (for the letter check)</option>
          {HANDWRITING_EXERCISES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        {preview ? (
          <img src={preview} alt="Uploaded handwriting" style={{ maxWidth: '100%', marginTop: 10, borderRadius: 10 }} />
        ) : null}
        {err ? <div className="feedback bad">{err}</div> : null}
      </Card>

      <div>
        {output ? (
          <ResultsCard output={output} exerciseRef="" source={output.ocr ? 'upload' : 'upload'} ocrOut={ocrOut} busy={busy} />
        ) : (
          <Card>
            <EmptyState title="No image analysed yet" note="Numbers appear here with explicit notes for anything that cannot be measured." />
          </Card>
        )}
      </div>
    </div>
  );
}

/* --------------------------- shared pipeline --------------------------- */

function measureCanvas(c: HTMLCanvasElement): { output: AnalyzeOutput; bin: BinImage } {
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const gray: Gray8 = rgbaToGray(img.data, c.width, c.height);
  const stretched = contrastStretch(gray);
  const denoised = medianDenoise(stretched);
  const quality = qualityFromGray(c.width, c.height, denoised.data);
  const bin0 = adaptiveThreshold(denoised);
  const skew = estimateSkew(bin0);
  const grayLevel = Math.abs(skew) >= 0.25 ? rotate(denoised, skew) : denoised;
  const bin = adaptiveThreshold(grayLevel);
  const measures = measure(bin);
  const scores = scoreResult(measures, quality);
  const out: AnalyzeOutput = {
    quality,
    scores,
    overall: overallScore(scores),
    width: c.width,
    height: c.height,
    ocr: null,
  };
  return { output: out, bin };
}

/* ------------------------------- results ------------------------------- */

function ResultsCard({
  output,
  exerciseRef,
  source,
  ocrOut,
  busy,
  onRunOcr,
}: {
  output: AnalyzeOutput;
  exerciseRef: string;
  source: 'canvas' | 'upload' | 'camera';
  ocrOut: OcrOutcome | null;
  busy: boolean;
  onRunOcr?: () => void;
}) {
  const history = getSnapshot().handwriting.filter((h) => h.source === source);
  return (
    <Card>
      <div className="row spread">
        <Eyebrow>Result</Eyebrow>
        {output.overall != null ? (
          <Badge tone="ok">overall {Math.round(output.overall)} / 100</Badge>
        ) : (
          <Badge tone="err">overall — not measurable</Badge>
        )}
      </div>

      <ul className="metrics">
        {output.scores.map((m) => (
          <li key={m.key}>
            <div className="row spread">
              <b>{m.label}</b>
              <span className="tiny">
                {m.value != null ? `${round(m.value)}${m.unit}` : '—'}
              </span>
            </div>
            <Progress value={m.score ?? 0} />
            <div className="tiny">
              {m.score != null ? `score ${Math.round(m.score)}/100` : `not measurable: ${m.gate}`}
            </div>
            <div className="tiny muted">{m.note}</div>
          </li>
        ))}
      </ul>

      <Callout>
        {output.quality.warnings.length === 0 ? 'Image quality checks passed.' : output.quality.warnings.join(' ')}
      </Callout>

      {exerciseRef ? (
        <Button small onClick={onRunOcr} disabled={busy}>
          {ocrOut ? 'Re-run letter check (OCR)' : 'Check letters with OCR'}
        </Button>
      ) : null}

      {ocrOut ? <OcrDiff ocr={ocrOut} reference={exerciseRef} /> : null}

      <p className="tiny" style={{ marginTop: 8 }}>
        {history.length} saved {source} session{history.length === 1 ? '' : 's'} in progress.
        {output.ocr ? ' This run includes letter recognition.' : ''}
      </p>
    </Card>
  );
}

function OcrDiff({ ocr, reference }: { ocr: OcrOutcome; reference: string }) {
  return (
    <div style={{ marginTop: 10 }}>
      <Eyebrow>Letter check ({ocr.engine})</Eyebrow>
      <p className="tiny">Reference: {reference}</p>
      <p className="tiny">Recognised: {ocr.words.map((w) => w.word).join(' ') || '(nothing recognised)'}</p>
      <Badge tone={ocr.comparison.similarity >= 0.6 ? 'ok' : 'copper'}>
        similarity {Math.round(ocr.comparison.similarity * 100)}%
      </Badge>
      <div className="diff">
        {ocr.comparison.tokens.map((t, i) => (
          <span key={i} className={`tok ${t.kind}`}>
            {t.kind === 'del' ? (t.reference ?? '') : (t.produced ?? '')}
          </span>
        ))}
      </div>
      <p className="tiny">Nothing is fetched in this comparison beyond the one-time OCR engine load.</p>
    </div>
  );
}

/* -------------------------------- utils -------------------------------- */

function redraw(c: HTMLCanvasElement, strokes: Array<Array<{ x: number; y: number }>>, ruled: boolean, pen = 4): void {
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#c7d8cd';
  if (ruled) {
    for (let y = 60; y < c.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(c.width, y);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#182b26';
  ctx.lineWidth = pen;
  for (const s of strokes) {
    if (!s.length) continue;
    ctx.beginPath();
    ctx.moveTo(s[0]!.x, s[0]!.y);
    for (const p of s.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('That file could not be opened as an image.'));
    img.src = url;
  });
}

function round(x: number): string {
  return (Math.round(x * 10) / 10).toString();
}

const selectStyle: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#fffef9',
  color: 'var(--ink)',
  maxWidth: '100%',
};

export {};
