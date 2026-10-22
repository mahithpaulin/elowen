import {
  computeRecommendations,
  streak,
  xpLevelFromSnapshot,
  getSnapshot,
  xpRangeForLevel,
  nextLessonTarget,
  topicAccuracy,
  isDemoEvent,
  ALL_UNITS,
  lessonById,
} from '../storage/appstore';
import { Card, Stat, Button, Eyebrow, EmptyState, DemoBanner, Progress, Callout } from '../components/ui';
import { navigate } from '../app/router';
import { parseLessonTarget, toLevelPct } from './helpers';
import type { LessonData, UnitData } from '../types';

/** Dashboard: overview, streak, stats and deterministic recommendations. */
export function DashboardPage() {
  const snap = getSnapshot();
  const { level, xp } = xpLevelFromSnapshot(snap);
  const range = xpRangeForLevel(level);
  const pct = toLevelPct(xp, range.min, range.max);
  const streakDays = streak(snap.events);
  const recs = computeRecommendations(snap);
  const lessonsDone = snap.lessons.filter((l) => l.best >= 80).length;
  // The tour shows the sample data on purpose; the banner says so, and the
  // Progress page keeps the averages strictly to real work.
  const weakTopic = topicAccuracy(
    snap.events.filter((e) => e.score != null && e.ts > Date.now() - 14 * 86400000),
  )[0];
  const nextTarget = nextLessonTarget(snap.events, snap.lessons);
  const nextLesson = nextTarget ? targetToLesson(nextTarget) : null;
  const hasDemo = snap.events.some((e) => isDemoEvent(e));
  const todayCount = snap.events.filter((e) => e.ts > Date.now() - 86400000).length;

  return (
    <>
      <div className="hero">
        <h1>Today’s study plan</h1>
        <p>Everything here is derived from your recorded practice. Nothing is invented.</p>
        <div className="chiprow">
          <span className="chip">Level {level}</span>
          <span className="chip">{streakDays > 0 ? `${streakDays}-day streak` : 'New streak — practise today'}</span>
          <span className="chip">{lessonsDone} lessons mastered</span>
        </div>
      </div>

      {hasDemo ? <DemoBanner /> : null}

      <div className="grid2">
        <Card>
          <Eyebrow>Continue learning</Eyebrow>
          {nextTarget && nextLesson ? (
            <>
              <h3>{nextLesson.lesson.title}</h3>
              <p className="muted">{nextLesson.unit.title}</p>
              <Button primary onClick={() => navigate(nextTarget)} type="button">
                Open lesson →
              </Button>
            </>
          ) : (
            <EmptyState title="Curriculum finished" note="Every lesson is at 80% or above." />
          )}
          <div className="row" style={{ marginTop: 14 }}>
            <span className="tiny">
              xp {xp} · level {level} needs {range.max}
            </span>
            <Progress value={pct} />
          </div>
        </Card>

        <Card>
          <Eyebrow>Recent performance</Eyebrow>
          <div className="grid2" style={{ gap: 8 }}>
            <Stat num={streakDays} lbl="day streak" />
            <Stat num={weakTopic ? `${Math.round(weakTopic.avg)}%` : '—'} lbl={weakTopic ? `weakest now: ${weakTopic.topic}` : 'needs data'} />
            <Stat num={snap.handwriting.length} lbl="handwriting sessions" />
            <Stat num={snap.speaking.length} lbl="speaking sessions" />
          </div>
          {weakTopic && weakTopic.avg < 70 ? (
            <Callout>
              The rule engine flagged <b>{weakTopic.topic}</b> ({Math.round(weakTopic.avg)}% recent average).
              A refresher is queued below.
            </Callout>
          ) : weakTopic ? (
            <Callout>
              Topic average {Math.round(weakTopic.avg)}% on {weakTopic.topic}. Keep the loop going —
              consistency beats cramming.
              {hasDemo ? ' (Sample data is included in these numbers.)' : ''}
            </Callout>
          ) : (
            <p className="tiny">Scores appear once you finish lessons or labs.</p>
          )}
        </Card>

        <Card>
          <Eyebrow>Recommended next</Eyebrow>
          {recs.length === 0 ? (
            <EmptyState
              title="No suggestions yet"
              note="Recommendations appear only from recorded results."
            />
          ) : (
            <ul className="list-plain">
              {recs.map((r, i) => (
                <li key={i} className="row spread">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="tiny">{r.reason}</div>
                  </div>
                  <Button small onClick={() => navigate(r.to.replace(/^#/, ''))}>
                    Open
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <Eyebrow>Quick labs</Eyebrow>
          <div className="row">
            <Button onClick={() => navigate('/handwriting')}>Handwriting Lab</Button>
            <Button onClick={() => navigate('/speaking')}>Speaking Lab</Button>
            <Button onClick={() => navigate('/grammar')}>Grammar Lab</Button>
          </div>
          <p className="tiny" style={{ marginTop: 10 }}>
            Handwriting runs image processing locally; Speaking records and analyses audio
            in the browser, with an optional one-time download of an offline recogniser.
          </p>
          <p className="tiny" style={{ marginTop: 6 }}>
            {todayCount > 0
              ? `${todayCount} recorded item${todayCount === 1 ? '' : 's'} today.`
              : 'Nothing recorded today yet — one lesson keeps the streak alive.'}
          </p>
        </Card>
      </div>
    </>
  );
}

function targetToLesson(target: string): { unit: UnitData; lesson: LessonData } | null {
  const parts = parseLessonTarget(target);
  if (!parts) return null;
  const unit = ALL_UNITS.find((u) => u.id === parts.unitId);
  const lesson = lessonById(parts.lessonId);
  if (!unit || !lesson) return null;
  return { unit, lesson };
}
