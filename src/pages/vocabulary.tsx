import { useMemo, useState } from 'react';
import { WORDS, VERIFIED_WORD_COUNT } from '../data/vocabulary/words';
import { getSnapshot, upsertSrs, recordEvent, dueSrsCards } from '../storage/appstore';
import { srsUpdate, QUALITY_LABELS } from '../engines/srs';
import { Button, Card, Badge, Eyebrow, Progress, EmptyState, Callout } from '../components/ui';
import { shuffle } from '../utils';
import type { SrsCard } from '../types';

type Mode = 'browse' | 'flashcards' | 'quiz';

const DIFF_LABEL: Record<number, string> = { 1: 'core', 2: 'everyday', 3: 'advanced' };

export function VocabularyPage() {
  const [mode, setMode] = useState<Mode>('browse');
  const snap = getSnapshot();
  const due = dueSrsCards(snap.srs);

  return (
    <>
      <h1>Vocabulary</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        {VERIFIED_WORD_COUNT} fully authored entries with verified definitions, examples and
        synonyms — plus spaced repetition that schedules your reviews. No dictionary data is
        invented when missing.
      </p>

      <div className="seg" role="tablist" style={{ marginBottom: 12 }}>
        <button aria-pressed={mode === 'browse'} onClick={() => setMode('browse')}>
          Browse
        </button>
        <button aria-pressed={mode === 'flashcards'} onClick={() => setMode('flashcards')}>
          Flashcards {due.length > 0 ? `· ${due.length} due` : ''}
        </button>
        <button aria-pressed={mode === 'quiz'} onClick={() => setMode('quiz')}>
          Quiz
        </button>
      </div>

      {mode === 'browse' ? <Browse /> : null}
      {mode === 'flashcards' ? <Flashcards due={due} /> : null}
      {mode === 'quiz' ? <Quiz /> : null}
    </>
  );
}

/* ----------------------------- browse ----------------------------- */

function Browse() {
  const snap = getSnapshot();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? WORDS.filter((w) => w.word.includes(needle) || w.definition.includes(needle)) : WORDS;
    return [...list].sort((a, b) => a.difficulty - b.difficulty || a.word.localeCompare(b.word));
  }, [q]);
  return (
    <>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${WORDS.length} words`}
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '10px 13px',
          background: '#fffef9',
        }}
        aria-label="Search words"
      />
      <div className="grid2" style={{ marginTop: 12 }}>
        {filtered.map((w) => {
          const card = snap.srs.find((c) => c.wordId === w.id);
          const mastery = card ? Math.min(99, card.reps * 18) : 0;
          return (
            <Card key={w.id} tight>
              <div className="row spread">
                <h3 style={{ margin: 0 }}>{w.word}</h3>
                <Badge tone={w.difficulty === 3 ? 'copper' : 'outline'}>{DIFF_LABEL[w.difficulty]}</Badge>
              </div>
              <div className="tiny">{w.pos}</div>
              <p style={{ marginBottom: 4 }}>{w.definition}</p>
              <p className="tiny" style={{ fontStyle: 'italic' }}>
                “{w.example}”
              </p>
              {w.synonyms ? (
                <p className="tiny">
                  syn: {w.synonyms.join(', ')}
                  {w.antonyms ? ` · ant: ${w.antonyms.join(', ')}` : ''}
                </p>
              ) : null}
              {card ? (
                <div className="row" style={{ gap: 8 }}>
                  <span className="tiny">mastery</span>
                  <Progress value={mastery} />
                </div>
              ) : (
                <AddToSrs wordId={w.id} label="Add to reviews" />
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function AddToSrs({ wordId, label }: { wordId: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      small
      accent
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await upsertSrs({
          wordId,
          ease: 2.5,
          interval: 0,
          due: Date.now(),
          reps: 0,
          lapses: 0,
          lastTs: Date.now(),
        });
        setBusy(false);
      }}
    >
      {label}
    </Button>
  );
}

/* --------------------------- flashcards --------------------------- */

function Flashcards({ due }: { due: SrsCard[] }) {
  const snap = getSnapshot();
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const queue = due.length ? due : snap.srs;
  const card = queue[idx];

  if (!card) {
    return (
      <EmptyState
        title="No cards yet"
        note="Add words to your review queue from the Browse tab — they come back at growing intervals."
        action={<Button accent onClick={() => window.location.reload()}>Reload</Button>}
      />
    );
  }
  const word = WORDS.find((w) => w.id === card.wordId);
  if (!word) return <EmptyState title="Card data issue" note="The word for this card is missing." />;

  const rate = async (quality: number) => {
    await upsertSrs({ ...card, ...srsUpdate(card, quality) });
    await recordEvent({ kind: 'vocab', topic: 'vocab', refId: word.id, score: quality >= 3 ? 80 + quality : 40, xp: 6 });
    setFlipped(false);
    setIdx((i) => (i + 1) % queue.length);
  };

  return (
    <>
      <div className={`flash ${flipped ? 'flipped' : ''}`} style={{ maxWidth: 460, margin: '10px auto' }}>
        <div className="inner" style={{ height: 250 }}>
          <div className="face front" onClick={() => setFlipped(true)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFlipped(true)}>
            <span className="pos">{word.pos}</span>
            <span className="word">{word.word}</span>
            <span className="fliphint">tap to reveal the meaning</span>
          </div>
          <div className="face back" onClick={() => setFlipped(false)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setFlipped(false)}>
            <span className="pos">meaning</span>
            <span className="word" style={{ fontSize: '1.2rem' }}>{word.definition}</span>
            <span className="ex">“{word.example}”</span>
            {word.synonyms ? <span className="tiny">syn: {word.synonyms.join(', ')}</span> : null}
          </div>
        </div>
      </div>
      {flipped ? (
        <div className="row" style={{ justifyContent: 'center', gap: 8 }}>
          {[1, 3, 4, 5].map((q) => (
            <Button key={q} small primary={q === 4} onClick={() => void rate(q)} title={`${QUALITY_LABELS[q]}`}>
              {QUALITY_LABELS[q]}
            </Button>
          ))}
        </div>
      ) : (
        <p className="center-note">Review honestly — “Lost it” comes back tomorrow, “Easy” in a few weeks.</p>
      )}
      <p className="center-note tiny">
        {idx + 1} of {queue.length} in queue{due.length ? ` (${due.length} due today)` : ''}
      </p>
    </>
  );
}

/* ------------------------------ quiz ------------------------------ */

function Quiz() {
  const [round, setRound] = useState(0);
  const questions = useMemo(() => {
    const items = shuffle(WORDS, round + 3).slice(0, 8);
    return items.map((it) => {
      const wrong = shuffle(
        WORDS.filter((w) => w.id !== it.id && w.difficulty === it.difficulty),
        round * 7 + it.word.length,
      ).slice(0, 3);
      const options = shuffle([it.definition, ...wrong.map((w) => w.definition)], round + 5);
      return { word: it, options, answerIndex: options.indexOf(it.definition) };
    });
  }, [round]);

  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<null | number>(null);
  const [score, setScore] = useState(0);

  if (qi >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <Card style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <h2>Round finished</h2>
        <div className="stat" style={{ margin: '10px auto' }}>
          <div className="num">{pct}%</div>
          <div className="lbl">
            {score} / {questions.length} correct
          </div>
        </div>
        <Callout>Definitions come from the authored word list — same data drives everything.</Callout>
        <Button
          primary
          onClick={() => {
            setRound((r) => r + 1);
            setQi(0);
            setPicked(null);
            setScore(0);
          }}
        >
          Another round
        </Button>
      </Card>
    );
  }

  const q = questions[qi];
  const correct = picked === q.answerIndex;

  return (
    <Card style={{ maxWidth: 620, margin: '0 auto' }}>
      <div className="tiny">Question {qi + 1} of {questions.length}</div>
      <h2 style={{ marginTop: 4 }}>{q.word.word}</h2>
      <div className="tiny" style={{ marginBottom: 10 }}>
        {q.word.pos} · level {q.word.difficulty}
      </div>
      {q.options.map((opt, oi) => (
        <button
          key={oi}
          className="btn"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            justifyContent: 'flex-start',
            marginBottom: 8,
            borderColor: picked != null && oi === q.answerIndex ? 'var(--ok)' : undefined,
            background: picked === oi ? 'var(--sage)' : undefined,
          }}
          disabled={picked != null}
          onClick={() => setPicked(oi)}
        >
          {opt}
        </button>
      ))}
      {picked != null ? (
        <div className={`feedback ${correct ? 'ok' : 'bad'}`}>
          <b className="q">{correct ? 'Right. ' : 'Not this one. '}</b>“{q.word.word}” means:{' '}
          {q.word.definition}. Example: “{q.word.example}”.
        </div>
      ) : null}
      {picked != null ? (
        <Button
          primary
          onClick={async () => {
            if (correct) setScore(score + 1);
            setQi((i) => i + 1);
            setPicked(null);
          }}
        >
          Next question
        </Button>
      ) : null}
    </Card>
  );
}
