import { useMemo } from 'react';
import { getSnapshot, ALL_UNITS, demoEvents } from '../storage/appstore';
import { topicAccuracy } from '../engines/scoring/scoring';
import { BarChart, LineChart, Card, Eyebrow, EmptyState, Callout, Badge, Button } from '../components/ui';
import { navigate } from '../app/router';
import { WORDS } from '../data/vocabulary/words';
import { wordDate } from './helpers';

/** Progress: what the data says — history, topic averages and trends. */
export function ProgressPage() {
  const snap = getSnapshot();
  const events = snap.events;
  const topic = useMemo(() => topicAccuracy(events.filter((e) => e.kind !== 'demo')), [events.length]);

  const hwTrend = [...snap.handwriting]
    .sort((a, b) => a.ts - b.ts)
    .map((h) => ({ x: wordDate(h.ts), y: h.report.overall }));
  const spTrend = [...snap.speaking]
    .sort((a, b) => a.ts - b.ts)
    .map((s) => (s.similarity != null ? { x: wordDate(s.ts), y: s.similarity * 100 } : null))
    .filter((v): v is { x: string; y: number } => v != null);

  const dueCards = snap.srs.filter((c) => c.due <= Date.now()).length;
  const lessonsOpen = ALL_UNITS.flatMap((u) => u.lessons.map((l) => ({
    id: l.id,
    title: `${u.title} — ${l.title}`,
    best: snap.lessons.find((r) => r.lessonId === `${u.id}/${l.id}`)?.best ?? null,
  })))
    .filter((l) => l.best == null || l.best < 80);

  return (
    <>
      <h1>Progress</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Every number here is computed from your recorded activity in this browser. Nothing is
        uploaded; downloads include events, scores and settings only.
      </p>

      {events.some((e) => e.kind === 'demo') ? (
        <Callout>
          Sample data is present (seeded from the dashboard banner). Demo events are clearly
          marked and excluded from the averages below.
        </Callout>
      ) : null}

      <div className="grid2">
        <Card>
          <Eyebrow>Topic averages (last 10 attempts)</Eyebrow>
          {topic.length === 0 ? (
            <EmptyState title="No scored activity yet" note="Complete lessons, labs or readings to fill this chart." />
          ) : (
            <BarChart data={topic.map((t) => ({ x: t.topic, y: Math.round(t.avg) }))} max={100} />
          )}
        </Card>

        <Card>
          <Eyebrow>Handwriting — overall scores over time</Eyebrow>
          {hwTrend.length === 0 ? (
            <EmptyState
              title="No handwriting sessions"
              note="Analyse a sheet in the Handwriting Lab to start the trend."
              action={
                <Button small onClick={() => navigate('/handwriting')}>
                  Open lab
                </Button>
              }
            />
          ) : (
            <LineChart data={hwTrend} max={100} />
          )}
        </Card>

        <Card>
          <Eyebrow>Speaking — word match over time</Eyebrow>
          {spTrend.length === 0 ? (
            <EmptyState
              title="No scored speech sessions"
              note="Enable the optional offline recogniser in the Speaking Lab; audio-only runs do not produce a word-match score."
            />
          ) : (
            <LineChart data={spTrend} max={100} />
          )}
        </Card>

        <Card>
          <Eyebrow>Learning trail</Eyebrow>
          <ul className="list-plain" style={{ maxHeight: 280, overflow: 'auto' }}>
            {events.length === 0 ? (
              <li className="muted tiny">Nothing yet — your first finished lesson lands here.</li>
            ) : (
              [...events]
                .sort((a, b) => b.ts - a.ts)
                .slice(0, 40)
                .map((e) => (
                  <li key={e.id} className="row spread">
                    <span className="tiny">
                      <b>{e.kind}</b>
                      {e.topic ? ` · ${e.topic}` : ''}
                      {e.kind === 'demo' ? ' · sample' : ''}
                    </span>
                    <span className="tiny">
                      {e.score != null ? `${Math.round(e.score)}% · ` : ''}+{e.xp} xp · {wordDate(e.ts)}
                    </span>
                  </li>
                ))
            )}
          </ul>
        </Card>

        <Card>
          <Eyebrow>Vocabulary queue</Eyebrow>
          <div className="row">
            <Badge tone="outline">{snap.srs.length} cards in rotation</Badge>
            <Badge tone={dueCards > 0 ? 'copper' : 'outline'}>{dueCards} due now</Badge>
          </div>
          {snap.srs.length > 0 ? (
            <p className="tiny" style={{ marginTop: 8 }}>
              {snap.srs
                .slice(0, 8)
                .map((c) => WORDS.find((w) => w.id === c.wordId)?.word ?? c.wordId)
                .join(', ')}
              {snap.srs.length > 8 ? '…' : ''}
            </p>
          ) : (
            <EmptyState title="Queue empty" note="Add words from vocabulary Browse or a quiz round." />
          )}
        </Card>

        <Card>
          <Eyebrow>Lessons below mastery (80%)</Eyebrow>
          {lessonsOpen.length === 0 ? (
            <EmptyState title="Everything is mastered" note="Retries never lower a best score. Solid work." />
          ) : (
            <ul className="list-plain">
              {lessonsOpen.slice(0, 8).map((l) => (
                <li key={l.id} className="row spread">
                  <span className="tiny" style={{ minWidth: 0 }}>
                    {l.title}
                  </span>
                  <span className="tiny">{l.best != null ? `best ${l.best}%` : 'not started'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

void demoEvents;
