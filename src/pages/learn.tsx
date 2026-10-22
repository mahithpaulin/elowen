import { useState } from 'react';
import { ALL_UNITS, getSnapshot, recordLessonAttempt } from '../storage/appstore';
import { Card, Badge, Button, Progress, EmptyState, Eyebrow } from '../components/ui';
import { navigate } from '../app/router';
import { ExerciseDeck, LessonSummary } from '../features/curriculum/ExerciseDeck';

/** Learn: curriculum browser. */
export function LearnPage() {
  const snap = getSnapshot();
  const [tab, setTab] = useState<'beginner' | 'intermediate'>('beginner');

  return (
    <>
      <div className="row spread">
        <h1 style={{ marginBottom: 4 }}>Curriculum</h1>
        <div className="seg" role="tablist">
          <button aria-pressed={tab === 'beginner'} onClick={() => setTab('beginner')}>
            Beginner
          </button>
          <button aria-pressed={tab === 'intermediate'} onClick={() => setTab('intermediate')}>
            Intermediate
          </button>
        </div>
      </div>
      <p className="muted" style={{ marginBottom: 14 }}>
        Structured units. Each lesson: explanation → examples → exercises with instant
        feedback and recorded scores.
      </p>

      {ALL_UNITS.filter((u) => u.lessons.some((l) => l.level === tab)).map((unit) => {
        const lessons = unit.lessons.filter((l) => l.level === tab);
        return (
          <Card key={unit.id}>
            <Eyebrow>{unit.title}</Eyebrow>
            <p className="muted">{unit.blurb}</p>
            <ul className="list-plain">
              {lessons.map((l) => {
                const prog = snap.lessons.find((r) => r.lessonId === l.id);
                return (
                  <li key={l.id} className="row spread">
                    <div style={{ minWidth: 0 }}>
                      <a href={`#/learn/${unit.id}/${l.id}`}>
                        <b>{l.title}</b>
                      </a>
                      <div className="tiny" style={{ maxWidth: '58ch' }}>
                        {l.explanation.split('. ')[0]}.
                      </div>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Badge tone={prog ? 'ok' : 'outline'}>
                        {prog ? `best ${prog.best}%` : 'new'}
                      </Badge>
                      <Button small onClick={() => navigate(`learn/${unit.id}/${l.id}`)}>
                        {prog ? 'Retry' : 'Start'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </>
  );
}

/** Lesson player route: /learn/:unitId/:lessonId */
export function LessonPage({ unitId, lessonId }: { unitId: string; lessonId: string }) {
  const unit = ALL_UNITS.find((u) => u.id === unitId);
  const lesson = unit?.lessons.find((l) => l.id === lessonId);

  const [attempt, setAttempt] = useState(0);
  const [done, setDone] = useState<null | { percent: number; total: number }>(null);

  if (!unit || !lesson) {
    return <EmptyState title="Lesson not found" note="Pick a lesson from Learn." />;
  }

  const finish = async ({ percent, total }: { correctCount: number; total: number; percent: number }) => {
    await recordLessonAttempt(lesson.id, percent, Math.round((percent / 100) * 12), lesson.topic);
    setDone({ percent, total });
  };

  const nextLesson = nextLessonAfter(unit.id, lesson.id);

  return (
    <>
      <a className="tiny" href="#/learn">
        ← all lessons
      </a>
      <h1 style={{ margin: '6px 0 2px' }}>{lesson.title}</h1>
      <p className="tiny" style={{ marginBottom: 12 }}>
        {unit.title} · topic <code className="k">{lesson.topic}</code>
      </p>

      {done ? (
        <LessonSummary
          percent={done.percent}
          topic={lesson.topic}
          onRetry={() => {
            setDone(null);
            setAttempt((a) => a + 1);
          }}
          onNext={nextLesson ? () => navigate(nextLesson) : undefined}
          nextLabel={nextLesson ? 'Next lesson →' : undefined}
        />
      ) : (
        <>
          <Card>
            <h3>The idea</h3>
            <p>{lesson.explanation}</p>
            <Eyebrow>Examples</Eyebrow>
            <ul className="list-plain" style={{ fontSize: '0.95rem' }}>
              {lesson.examples.map((e, i) => (
                <li key={i} style={{ fontFamily: 'var(--font)' }}>
                  {e}
                </li>
              ))}
            </ul>
          </Card>
          <ExerciseDeck key={attempt} lesson={lesson} onFinish={finish} attempt={attempt} />
        </>
      )}
    </>
  );
}

/** The lesson that follows in the flat curriculum order, if any. */
function nextLessonAfter(unitId: string, lessonId: string): string | null {
  const flat = ALL_UNITS.flatMap((u) => u.lessons.map((l) => ({ unit: u, lesson: l })));
  const i = flat.findIndex((x) => x.unit.id === unitId && x.lesson.id === lessonId);
  if (i < 0 || i + 1 >= flat.length) return null;
  const n = flat[i + 1]!;
  return `learn/${n.unit.id}/${n.lesson.id}`;
}
