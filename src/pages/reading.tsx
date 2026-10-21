import { useState } from 'react';
import { PASSAGES } from '../data/reading/passages';
import type { LessonData } from '../types';
import { getSnapshot, recordReading, recordEvent } from '../storage/appstore';
import { Card, Badge, Button, Eyebrow, Callout } from '../components/ui';
import { ExerciseDeck, LessonSummary } from '../features/curriculum/ExerciseDeck';
import { navigate } from '../app/router';

/** Reading: original passages with comprehension questions. */
export function ReadingPage({ passageId }: { passageId?: string }) {
  const passage = PASSAGES.find((p) => p.id === passageId);
  if (!passage) {
    return (
      <>
        <h1>Reading</h1>
        <p className="muted" style={{ marginTop: -4 }}>
          Six original passages. Vocabulary support, comprehension questions with
          explanations, and an optional read-aloud link to the Speaking Lab.
        </p>
        <div className="grid2">
          {PASSAGES.map((p) => {
            const scores = getSnapshot()
              .events.filter((e) => e.kind === 'reading' && e.refId === p.id)
              .map((e) => e.score ?? 0);
            const best = scores.length ? Math.max(...scores) : null;
            return (
              <Card key={p.id} tight>
                <div className="row spread">
                  <h3 style={{ margin: 0 }}>{p.title}</h3>
                  <Badge tone={p.level === 'intermediate' ? 'copper' : 'outline'}>{p.level}</Badge>
                </div>
                <p className="muted">{p.text[0]!.slice(0, 120)}…</p>
                <div className="row spread">
                  <span className="tiny">{best != null ? `best ${best}%` : 'unread'}</span>
                  <Button primary small onClick={() => navigate(`reading/${p.id}`)}>
                    Open →
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </>
    );
  }

  return <PassageReader passageIdc={passage.id} />;
}

function PassageReader({ passageIdc }: { passageIdc: string }) {
  const passage = PASSAGES.find((p) => p.id === passageIdc)!;
  const [done, setDone] = useState<null | { percent: number; total: number }>(null);
  const lesson: LessonData = {
    id: `reading/${passage.id}`,
    title: passage.title,
    level: passage.level,
    topic: 'reading',
    explanation: 'Read carefully. The questions ask about facts explicitly stated in the passage — nothing outside it.',
    examples: [],
    exercises: passage.questions,
  };

  return (
    <>
      <a className="tiny" href="#/reading">
        ← all passages
      </a>
      <h1 style={{ margin: '6px 0 2px' }}>{passage.title}</h1>
      <Badge tone={passage.level === 'intermediate' ? 'copper' : 'outline'}>{passage.level}</Badge>

      <Card>
        {passage.text.map((par, i) => (
          <p key={i} style={{ fontSize: '1.02rem', lineHeight: 1.7 }}>
            {par}
          </p>
        ))}
      </Card>

      <Card>
        <Eyebrow>Vocabulary in this passage</Eyebrow>
        <ul className="list-plain">
          {passage.vocab.map((v) => (
            <li key={v.word}>
              <b>{v.word}</b> — {v.meaning}
            </li>
          ))}
        </ul>
      </Card>

      {done ? (
        <>
          <LessonSummary
            percent={done.percent}
            total={done.total}
            topic="reading"
            onRetry={() => setDone(null)}
          />
          <Callout>
            Optional next step: read the passage aloud once and past the word-count check in
            the Speaking Lab — try the exact target sentence: “{passage.readAloudTarget}”
            <div className="row" style={{ marginTop: 10 }}>
              <Button small onClick={() => navigate('/speaking')}>
                Open Speaking Lab →
              </Button>
            </div>
          </Callout>
        </>
      ) : (
        <ExerciseDeck
          lesson={lesson}
          onFinish={async ({ percent }) => {
            await recordReading(passage.id, percent);
            await recordEvent({ kind: 'reading', topic: 'reading', refId: passage.id, score: percent, xp: Math.round((percent / 100) * 10) });
            setDone({ percent, total: passage.questions.length });
          }}
        />
      )}
    </>
  );
}
