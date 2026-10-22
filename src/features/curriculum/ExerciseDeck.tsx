import { useMemo, useState } from 'react';
import type { Exercise, LessonData } from '../../types';
import { checkAnswer, mcqPresentation, tileOrder } from './exercise';
import { Button, Card, Progress } from '../../components/ui';
import { hashString } from '../../utils';

type Phase = 'answer' | 'feedback';

/**
 * Lesson player: renders each exercise, gives immediate feedback with an
 * explanation, records results, and offers targeted retries for missed ones.
 * Keep the UI dumb — all logic lives in the engines.
 */
export function ExerciseDeck({
  lesson,
  onFinish,
  attempt = 0,
}: {
  lesson: LessonData;
  onFinish: (result: { correctCount: number; total: number; percent: number }) => void;
  /** Bumped on retry — re-shuffles the options so a retry is not memorised. */
  attempt?: number;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answer');
  const [results, setResults] = useState<boolean[]>([]);
  const [mcqChoice, setMcqChoice] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [usedTiles, setUsedTiles] = useState<number[]>([]);

  const ex = lesson.exercises[index]!;
  const seed = hashString(`${lesson.id}#${index}#${attempt}`);

  /**
   * Options are shuffled per lesson, per exercise and per attempt. The lesson
   * data has the right answer first in every single multiple-choice item, so
   * before this the first option was always the answer — picking "A" every
   * time scored 100%. Deterministic, but no longer a giveaway.
   */
  const mcq = useMemo(() => {
    if (ex.type !== 'mcq') return null;
    return mcqPresentation(ex, seed);
  }, [ex, seed]);

  const tiles = useMemo(
    () => (ex.type === 'wordOrder' ? tileOrder(ex, seed) : []),
    [ex, seed],
  );

  const answered =
    (ex.type === 'mcq'
      ? mcqChoice != null
      : ex.type === 'wordOrder'
        ? usedTiles.length === tiles.length && tiles.length > 0
        : typed.trim() !== '') && phase === 'answer';

  const submit = () => {
    let response: unknown = null;
    if (ex.type === 'mcq') {
      // mcqChoice is a position in the shuffled list; checkAnswer expects the
      // original option index, so map it back before comparing.
      response = mcq && mcqChoice != null ? mcq.order[mcqChoice] : null;
    } else if (ex.type === 'type') response = typed;
    else response = usedTiles.map((i) => tiles[i]).join(' ');
    const verdict = checkAnswer(ex, response);
    setResults((r) => [...r, verdict.correct]);
    setPhase('feedback');
  };

  const next = () => {
    setMcqChoice(null);
    setTyped('');
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

  const answerLine = ex.type === 'wordOrder' ? usedTiles.map((i) => tiles[i]).join(' ') : '';

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

        {ex.type === 'mcq' && mcq ? (
          <div className="stack-lg" style={{ gap: 8 }}>
            {mcq.options.map((opt, oi) => {
              const picked = mcqChoice === oi;
              const isRight = oi === mcq.answerIndex;
              return (
                <button
                  key={oi}
                  className={`btn opt${picked ? ' picked' : ''}${phase === 'feedback' && isRight ? ' right' : ''}${phase === 'feedback' && picked && !isRight ? ' wrong' : ''}`}
                  onClick={() => setMcqChoice(oi)}
                  disabled={phase === 'feedback'}
                >
                  <span className="opt-key" aria-hidden="true">
                    {'ABCD'[oi]}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        ) : null}

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
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
            />
            {ex.hint ? <span className="tiny">{ex.hint}</span> : null}
          </div>
        )}

        {ex.type === 'wordOrder' && (
          <>
            <div className="answerline">
              <div
                className={`ordered ${answerLine ? '' : 'empty'}`}
                onClick={() => {
                  if (phase !== 'answer' || usedTiles.length === 0) return;
                  setUsedTiles((u) => u.slice(0, -1));
                }}
              >
                {answerLine || 'Tap the words below in order — tap here to take one back.'}
              </div>
            </div>
            <div className="tiles">
              {tiles.map((t, ti) => (
                <button
                  key={ti}
                  className={`tile ${usedTiles.includes(ti) ? 'used' : ''}`}
                  onClick={() => setUsedTiles((u) => [...u, ti])}
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

      <div className="actionbar">
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
  onNext,
  nextLabel,
}: {
  percent: number;
  topic: string;
  onRetry: () => void;
  onNext?: () => void;
  nextLabel?: string;
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
      <div className="row">
        <Button onClick={onRetry}>Retry lesson</Button>
        {onNext ? (
          <Button primary onClick={onNext}>
            {nextLabel ?? 'Next lesson →'}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
