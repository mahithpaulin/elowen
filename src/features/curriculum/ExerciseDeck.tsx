import { useMemo, useState } from 'react';
import type { Exercise, LessonData } from '../../types';
import { checkAnswer, tileOrder } from './exercise';
import { Button, Card, Progress } from '../../components/ui';

type Phase = 'answer' | 'feedback';

/**
 * Lesson player: renders each exercise, gives immediate feedback with an
 * explanation, records results, and offers targeted retries for missed ones.
 * Keep the UI dumb — all logic lives in the engines.
 */
export function ExerciseDeck({
  lesson,
  onFinish,
}: {
  lesson: LessonData;
  onFinish: (result: { correctCount: number; total: number; percent: number }) => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [results, setResults] = useState<boolean[]>([]);
  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [tiles, setTiles] = useState<string[]>([]);
  const [usedTiles, setUsedTiles] = useState<number[]>([]);

  const ex = lesson.exercises[index]!;
  const orderedTiles = useMemo(() => (ex.type === 'wordOrder' ? tileOrder(ex) : []), [ex]);

  if (ex.type === 'wordOrder' && tiles.length === 0 && orderedTiles.length) setTiles(orderedTiles);

  const answered = (ex.type === 'mcq' ? mcqChoice != null : ex.type === 'wordOrder' ? usedTiles.length === tiles.length : typed.trim() !== '') && phase === 'answer';

  const submit = () => {
    let response: unknown = null;
    if (ex.type === 'mcq') response = mcqChoice;
    else if (ex.type === 'type') response = typed;
    else response = usedTiles.map((i) => tiles[i]).join(' ');
    const verdict = checkAnswer(ex, response);
    setResults((r) => [...r, verdict.correct]);
    setPhase('feedback');
  };

  const next = () => {
    setMcqChoice(null);
    setTyped('');
    setTiles(orderedTiles.slice());
    setUsedTiles([]);
    setPhase('answer');
    if (index + 1 >= lesson.exercises.length) {
      const total = lesson.exercises.length;
      const correctCount = results.reduce((a, b) => a + (b ? 1 : 0), 0);
      onFinish({ correctCount, total, percent: Math.round((correctCount / total) * 100) });
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <div>
      <div className="row spread">
        <div className="tiny">
          Exercise {index + 1} of {lesson.exercises.length}
        </div>
        <div className="ex-progress" aria-hidden="true">
          {lesson.exercises.map((_, i) => (
            <i key={i} className={i < index ? 'done' : i === index ? 'now' : ''} />
          ))}
        </div>
      </div>

      <Card className="tight">
        <h3 style={{ marginTop: 0 }}>{ex.prompt}</h3>

        {ex.type === 'mcq' && (
          <div className="stack-lg" style={{ gap: 8 }}>
            {ex.options.map((opt, oi) => (
              <button
                key={oi}
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  borderColor: mcqChoice === oi ? 'var(--copper)' : undefined,
                  background: mcqChoice === oi ? 'var(--sage)' : undefined,
                }}
                onClick={() => setMcqChoice(oi)}
                disabled={phase === 'feedback'}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {ex.type === 'type' && (
          <div className="answerline">
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type your answer"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && answered) submit();
              }}
              disabled={phase === 'feedback'}
              autoFocus
            />
            {ex.hint ? <span className="tiny">{ex.hint}</span> : null}
          </div>
        )}

        {ex.type === 'wordOrder' && (
          <>
            <div className="answerline">
              <div style={{ minHeight: 30 }}>{usedTiles.map((i) => tiles[i]).join(' ')}</div>
            </div>
            <div className="tiles">
              {tiles.map((t, ti) => (
                <button
                  key={ti}
                  className={`tile ${usedTiles.includes(ti) ? 'used' : ''}`}
                  onClick={() => setUsedTiles([...usedTiles, ti])}
                  disabled={phase === 'feedback' || usedTiles.includes(ti)}
                >
                  {t}
                </button>
              ))}
            </div>
            {usedTiles.length > 0 && phase === 'answer' ? (
              <button className="btn small" onClick={() => setUsedTiles([])}>
                clear order
              </button>
            ) : null}
          </>
        )}
      </Card>

      {phase === 'answer' ? (
        <Button primary disabled={!answered} onClick={submit}>
          Check answer
        </Button>
      ) : (
        <Feedback
          ok={results[results.length - 1] ?? false}
          ex={ex}
          onNext={next}
          isLast={index + 1 >= lesson.exercises.length}
        />
      )}
    </div>
  );
}

function Feedback({
  ok,
  ex,
  onNext,
  isLast,
}: {
  ok: boolean;
  ex: Exercise;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div>
      <div className={`feedback ${ok ? 'ok' : 'bad'}`}>
        <b className="q">{ok ? 'Correct. ' : 'Not quite. '}</b> {ex.explanation}
      </div>
      <Button primary onClick={onNext}>
        {isLast ? 'Finish lesson' : 'Next exercise →'}
      </Button>
    </div>
  );
}

export function LessonSummary({
  percent,
  topic,
  onRetry,
}: {
  percent: number;
  topic: string;
  onRetry: () => void;
}) {
  return (
    <Card>
      <h2>Lesson complete</h2>
      <p className="muted">{topic}</p>
      <div className="row" style={{ gap: 14, margin: '12px 0' }}>
        <div className="stat">
          <div className="num">{percent}%</div>
          <div className="lbl">score</div>
        </div>
        <Progress value={percent} />
      </div>
      <p className="muted">
        {percent >= 80
          ? 'Saved to your progress. Topics like this build streaks.'
          : 'Recorded — the dashboard will suggest a revisit since this topic needs work.'}
      </p>
      <Button primary onClick={onRetry}>
        Retry lesson
      </Button>
    </Card>
  );
}
